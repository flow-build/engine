const { v1: uuid } = require("uuid");
const _ = require("lodash");
const { PersistedEntity } = require("./base");
const { Packages } = require("./packages");
const { Lane } = require("./lanes");
const { Activity, ActivityStatus } = require("./activity");
const { Timer } = require("./timer");

const { getActivityManagerNotifier } = require("../notifier_manager");
const process_manager = require("./process_manager");
const activity_manager_factory = require("../utils/activity_manager_factory");
const crypto_manager = require("../crypto_manager");
const ajvValidator = require("../utils/ajvValidator");
const emitter = require("../utils/emitter");

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
      parameters: activity_manager._parameters,
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

  static async checkActorsPermission(activity_data_array, actor_data_array) {
    const allowed_activities = new Map(actor_data_array.map((actor_data) => [actor_data.actor_id, []]));

    for (let activity_data of activity_data_array) {
      const blueprint = activity_data.blueprint_spec;
      const node_id = activity_data.node_id;
      const lane_id = blueprint.nodes.filter((node) => node.id === node_id)[0].lane_id;
      const current_lane_spec = blueprint.lanes.filter((lane) => lane.id === lane_id)[0];
      const lisp = await Packages._fetchPackages(blueprint.requirements, blueprint.prepare);

      actor_data_array.forEach((actor_data) => {
        let is_allowed = Lane.runRule(current_lane_spec, actor_data, activity_data.bag, lisp);
        if (is_allowed && activity_data.parameters.channels && activity_data.parameters.channels instanceof Array) {
          is_allowed = activity_data.parameters.channels.indexOf(actor_data.channel) !== -1;
        }
        if (is_allowed) {
          allowed_activities.get(actor_data.actor_id).push(activity_data);
        }
      });
    }

    return allowed_activities;
  }

  static async fetchActivityManagerFromProcessId(process_id, actor_data, status) {
    const activity_managers = await ActivityManager.fetchActivitiesForActorFromStatus(status, actor_data, {
      process_id: process_id,
      type: "commit",
    });
    let result;
    if (activity_managers.length === 1) {
      result = activity_managers[0];
      result.activities = await this.getPersist().getActivities(result.id);
    }
    return result;
  }

  static async fetch(activity_manager_id) {
    const activity_manager = await this.getPersist().getActivityDataFromId(activity_manager_id);
    if (activity_manager) {
      activity_manager.activities = await this.getPersist().getActivities(activity_manager.id);
    }
    return activity_manager;
  }

  static async get(activity_manager_id, actor_data) {
    let result;
    const activity_manager = await this.getPersist().getActivityDataFromId(activity_manager_id);

    if (activity_manager) {
      const allowed_activities = await ActivityManager.checkActorPermission([activity_manager], actor_data);
      if (allowed_activities.length === 1) {
        result = allowed_activities[0];
        result.activities = await this.getPersist().getActivities(result.id);

        const timer = await this.getPersist().getTimerfromResourceId(activity_manager.id);
        if (timer.length !== 0) {
          result.expires_at = timer[0].expires_at;
        }
      }
    }
    return result;
  }

  static async addTimeInterval(id, timeInterval, resource_type) {
    let timer = await this.getPersist().getTimerfromResourceId(id);

    if (timer.length !== 0) {
      const new_expired_date = new Date(
        timer[0].expires_at.setTime(timer[0].expires_at.getTime() + timeInterval * 1000)
      );

      const db = Timer.getPersist()._db;
      await db("timer")
        .where("resource_type", resource_type)
        .andWhere("resource_id", id)
        .update({ expires_at: new_expired_date });
    } else {
      await ActivityManager.createTimer(id, timeInterval, resource_type);
    }
  }

  static async setExpiredDate(id, date, resource_type) {
    let timer = await this.getPersist().getTimerfromResourceId(id);

    if (timer.length !== 0) {
      timer.expires_at = new Date(date);

      const db = Timer.getPersist()._db;
      await db("timer")
        .where("resource_type", resource_type)
        .andWhere("resource_id", id)
        .update({ expires_at: timer.expires_at });
    } else {
      await ActivityManager.createTimer(id, date, resource_type);
    }
  }

  static async interruptActivityManagerForProcess(process_id) {
    const full_activity_manager_data = await this.getPersist().getActivityDataFromStatus(ActivityStatus.STARTED, {
      process_id: process_id,
    });
    for (const activity_manager_data of full_activity_manager_data) {
      const activity_manager = ActivityManager.deserialize(activity_manager_data);
      activity_manager.activities = activity_manager_data.activities;
      await activity_manager.interruptActivity(process_id);
    }
  }

  static async finishActivityManagerForProcess(process_id) {
    const full_activity_manager_data = await this.getPersist().getActivityDataFromStatus(ActivityStatus.STARTED, {
      process_id: process_id,
    });
    for (const activity_manager_data of full_activity_manager_data) {
      const activity_manager = ActivityManager.deserialize(activity_manager_data);
      activity_manager.activities = activity_manager_data.activities;
      await activity_manager._validateActivity(process_id);
    }
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

  async save(trx = false, ...args) {
    await this._initTimeout(trx);
    return await super.save(trx, ...args);
  }

  async beginActivity() {
    return this.props.result;
  }

  async commitActivity(process_id, actor_data, external_input, activity_schema) {
    if (this.parameters.encrypted_data) {
      const crypto = crypto_manager.getCrypto();
      for (const encrypted_data of this.parameters.encrypted_data) {
        const data = _.get(external_input, encrypted_data);
        if (data) {
          const encrypted = crypto.encrypt(data);
          _.set(external_input, encrypted_data, encrypted);
        }
      }
    }

    if (activity_schema) {
      ajvValidator.validateActivityManager(activity_schema, external_input);
    }

    const activity = await new Activity(this._id, actor_data, external_input, ActivityStatus.STARTED).save();
    this._activities.unshift(activity);
    await this.save();
    await this._notifyActivityManager(process_id);
    return this;
  }

  async pushActivity(process_id) {
    const is_completed = await this._validateActivity(process_id);
    return [is_completed, this._activities];
  }

  async interruptActivity(process_id) {
    this._status = ActivityStatus.INTERRUPTED;
    await this.save();
    await this._notifyActivityManager(process_id);
    return this;
  }

  async _validateActivity(process_id) {
    //ToDo
    this._status = ActivityStatus.COMPLETED;
    await this.save();
    emitter.emit("ACTIVITY_MANAGER.COMPLETED", `ACTIVITY MANAGER COMPLETED AMID: [${this.id}]`, {
      activity_manager: this,
    });

    await this._notifyActivityManager(process_id);
    return true;
  }

  async _notifyActivityManager(process_id) {
    const activity_manager_notifier = getActivityManagerNotifier();
    if (activity_manager_notifier) {
      await activity_manager_notifier({
        ...this,
        _process_id: process_id,
      });
    }
  }

  async _initTimeout(trx = false) {
    const timeout = this.parameters.timeout;
    if (timeout && this.status !== ActivityStatus.COMPLETED) {
      const next_step_number = this.parameters.next_step_number;

      const db = trx ? trx : Timer.getPersist()._db;
      await db("timer")
        .where("resource_type", "ActivityManager")
        .andWhere("resource_id", this.id)
        .update({ active: false });

      emitter.emit("ACTIVITY_MANAGER_TIMER.CLEARED", `      CLEARED TIMERS FOR AMID [${this.id}]`, {
        activity_manager_id: this.id,
      });

      emitter.emit("ACTIVITY_MANAGER_TIMER.CREATING_NEW", `      CREATING NEW TIMER ON AMID [${this.id}] `, {
        activity_manager_id: this.id,
      });
      const timer = new Timer("ActivityManager", this.id, Timer.timeoutFromNow(this.parameters.timeout), {
        next_step_number,
      });
      await timer.save(trx);
      emitter.emit("ACTIVITY_MANAGER.NEW_TIMER", `      NEW TIMER ON AMID [${this.id}] TIMER [${timer.id}]`, {
        activity_manager_id: this.id,
        timer_id: timer.id,
      });

      this.parameters.timeout_id = timer.id;
    }
  }

  async timeout(timer, trx) {
    emitter.emit("ACTIVITY_MANAGER.TIMEOUT_EXPIRED", `TIMEOUT ON AMID [${this.id}] TIMER [${timer.id}]`, {
      activity_manager_id: this.id,
      timer_id: timer.id,
    });

    const activity_manager_data = await ActivityManager.fetch(timer.resource_id);
    if (
      activity_manager_data &&
      activity_manager_data.parameters.timeout_id === timer.id &&
      activity_manager_data.activity_status === ActivityStatus.STARTED
    ) {
      const activity_manager = ActivityManager.deserialize(activity_manager_data);
      activity_manager.status = ActivityStatus.COMPLETED;
      await activity_manager.save(trx);
      emitter.emit("ACTIVITY_MANAGER.COMPLETED", `COMPLETED AMID [${this.id}]`, { activity_manager: activity_manager });

      await activity_manager._notifyActivityManager(activity_manager_data.process_id);
      if (activity_manager.type === "commit") {
        await process_manager.continueProcess(
          activity_manager_data.process_id,
          {
            is_continue: true,
            activities: activity_manager_data.activities,
          },
          timer.params.next_step_number
        );
      }
    }
  }

  static async createTimer(id, time, resource_type) {
    emitter.emit("ACTIVITY_MANAGER_TIMER.CREATING_NEW", `      CREATING NEW TIMER ON AMID [${id}]`, {
      activity_manager_id: id,
    });

    const db = Timer.getPersist()._db;

    if (time instanceof Date) {
      await db("timer").insert({
        id: uuid(),
        created_at: new Date(),
        expires_at: new Date(time),
        active: true,
        resource_type: "ActivityManager",
        resource_id: id,
        params: {},
      });
    } else {
      await db("timer").insert({
        id: uuid(),
        created_at: new Date(),
        expires_at: new Date(new Date().getTime() + time * 1000),
        active: true,
        resource_type: resource_type,
        resource_id: id,
        params: {},
      });
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
