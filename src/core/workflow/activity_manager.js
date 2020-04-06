const uuid = require('uuid/v1');
const _ = require("lodash");
const assert = require("assert");
const { PersistedEntity } = require("./base");
const { Packages } = require("./packages");
const { Lane } = require("./lanes");
const { Activity,
        ActivityStatus } = require("./activity");
const { getActivityManagerNotifier } = require("../notifier_manager");
const process_manager = require("./process_manager");
const activity_manager_factory = require("../utils/activity_manager_factory");

class ActivityManager extends PersistedEntity {

  static getEntityClass() {
    return ActivityManager;
  }

  static serialize(activity_manager) {
    return {
      id: activity_manager._id,
      created_at: activity_manager._created_at,
      type: activity_manager._type,
      process_state_id: activity_manager._process_state_id,
      status: activity_manager._status,
      props: activity_manager._props,
      parameters: activity_manager._parameters
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const activity_manager = activity_manager_factory.getActivityManager(
        serialized.type,
        serialized.process_state_id,
        serialized.status || serialized.activity_status,
        serialized.props,
        serialized.parameters
        );
      activity_manager._id = serialized.id;
      activity_manager._created_at = serialized.created_at;

      return activity_manager;
    }
    return undefined;
  }

  static async fetchActivitiesForActorFromStatus(status, actor_data, filters) {
    const activity_datas = await this.getPersist().getActivityDataFromStatus(status, filters);
    return await ActivityManager.checkActorPermission(activity_datas, actor_data);
  }

  static async checkActorPermission(activity_datas, actor_data) {
    const allowed_activities = [];
    for (let activity_data of activity_datas) {
      const blueprint = activity_data.blueprint_spec;
      const node_id = activity_data.node_id;
      const lane_id = blueprint.nodes.filter((node) => node.id === node_id)[0].lane_id;
      const current_lane_spec = blueprint.lanes.filter((lane) => lane.id === lane_id)[0];
      const lisp = await Packages._fetchPackages(blueprint.requirements, blueprint.prepare);
      let is_allowed = Lane.runRule(current_lane_spec, actor_data, activity_data.bag, lisp);
      if (is_allowed && activity_data.parameters.channels && activity_data.parameters.channels instanceof Array) {
        is_allowed = activity_data.parameters.channels.indexOf(actor_data.channel) !== -1;
      }
      if (is_allowed) {
        allowed_activities.push(activity_data);
      }
    }
    return allowed_activities;
  }

  static async fetchActivityManagerFromProcessId(process_id, actor_data, status) {
    const activity_managers = await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.STARTED,
                                                                             actor_data,
                                                                             {process_id: process_id, type: "commit"});
    assert.strictEqual(activity_managers.length, 1);
    const serialized = activity_managers[0];
    const deserialized = ActivityManager.deserialize(serialized);
    deserialized.activities = await this.getPersist().getActivities(deserialized.id);
    return deserialized;
  }

  static async fetchActivityForProcess(process_id, actor_data, status) {
    const activity_managers = await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.STARTED,
                                                                             actor_data,
                                                                             {process_id: process_id});
    assert.strictEqual(activity_managers.length, 1);
    const serialized = activity_managers[0];
    serialized.activities = await this.getPersist().getActivities(serialized.id);
    return serialized;
  }

  static async fetch(activity_manager_id, actor_data) {
    const activity_manager = await this.getPersist().getActivityDataFromId(activity_manager_id);
    const allowed_activities = await ActivityManager.checkActorPermission([activity_manager], actor_data);
    let result;
    if (allowed_activities.length === 1) {
      result = allowed_activities[0];
      result.activities = await this.getPersist().getActivities(result.id);
    }
    return result;
  }

  get process_state_id() {
    return this._process_state_id;
  }

  set process_state_id(process_state_id) {
    this._process_state_id = process_state_id;
  }

  get status() {
    return this._status;
  }

  set status(status) {
    this._status = status;
  }

  get props() {
    return this._props;
  }

  set props(props) {
    this._props = props;
  }

  get parameters() {
    return this._parameters;
  }

  set parameters(parameters) {
    this._parameters = parameters;
  }

  get activities() {
    return this._activities;
  }

  set activities(activities) {
    this._activities = activities;
  }

  get type() {
    return this._type;
  }

  set type(type) {
    this._type = type;
  }

  constructor(process_state_id, status, props, parameters) {
    super();
    this._process_state_id = process_state_id;
    this._props = props;
    this._parameters = parameters;
    this._status = status || ActivityStatus.STARTED;
    this._type = "commit";
    this._activities = [];
  }

  async save(...args) {
    this._initTimeout();
    return await super.save(...args);
  }

  async beginActivity() {
    return this.props.result;
  }

  async commitActivity(process_id, actor_data, external_input) {
    const activity = await new Activity(this._id,
                                        actor_data,
                                        external_input,
                                        ActivityStatus.STARTED).save();
    this._activities.push(activity);
    await this.save();
    await this._notifyActivityManager(process_id);
    return this;
  }

  async pushActivity(process_id) {
    const is_completed = await this._validateActivity(process_id);
    return [is_completed, this._activities];
  }

  async _validateActivity(process_id){
    //ToDo
    this._status = ActivityStatus.COMPLETED;
    await this.save();
    await this._notifyActivityManager(process_id);
    return true;
  }

  async _notifyActivityManager(process_id) {
    const activity_manager_notifier = getActivityManagerNotifier();
    if (activity_manager_notifier) {
      await activity_manager_notifier({
        ...this,
        _process_id: process_id
      });
    }
  }

  _initTimeout() {
    const timeout = this.parameters.timeout;
    if (timeout && this.status !== ActivityStatus.COMPLETED) {
      const timeout_id = uuid();
      this.parameters.timeout_id = timeout_id;
      setTimeout(async () => {
        const activity_manager_data = await this.getPersist().getActivityDataFromId(this.id);
        if (
          activity_manager_data
          && activity_manager_data.parameters.timeout_id === timeout_id
          && activity_manager_data.activity_status === ActivityStatus.STARTED
        ) {
          const activity_manager = ActivityManager.deserialize(activity_manager_data);
          activity_manager.status = ActivityStatus.COMPLETED;
          await activity_manager.save();
          await activity_manager._notifyActivityManager(activity_manager_data.process_id);
          await process_manager.continueProcess(activity_manager_data.process_id, { is_continue: true, activities: this._activities });
        }
      }, (timeout * 1000));
    }
  }
}

class NotifyActivityManager extends ActivityManager {
  constructor(process_state_id, status, props, parameters) {
    super(process_state_id, status, props, parameters);
    this._type = "notify";
  }
}

module.exports = {
  ActivityManager: ActivityManager,
  NotifyActivityManager: NotifyActivityManager,
};
