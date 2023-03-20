const _ = require("lodash");
const { v1: uuid } = require("uuid");
const { PersistedEntity } = require("./base");
const { Packages } = require("./packages");
const { Lane } = require("./lanes");
const { Activity, ActivityStatus } = require("./activity");
const { Timer } = require("./timer");
const { Events } = require("./events/base");

const { getActivityManagerNotifier } = require("../notifier_manager");
const process_manager = require("./process_manager");
const activity_manager_factory = require("../utils/activity_manager_factory");
const crypto_manager = require("../crypto_manager");
const ajvValidator = require("../utils/ajvValidator");
const emitter = require("../utils/emitter");

async function initTimeout({ id, timeout, status, next_step_number, trx }) {
  if (timeout && status === ActivityStatus.STARTED) {
    const timer = new Timer("ActivityManager", id, Timer.timeoutFromNow(timeout), { next_step_number });
    const deact = await timer.deactivate(trx);
    if (deact) {
      emitter.emit("ACTIVITY_MANAGER_TIMER.CLEARED", `      CLEARED TIMERS FOR AMID [${id}]`, {
        activity_manager_id: id,
      });
    }

    emitter.emit("ACTIVITY_MANAGER_TIMER.CREATING_NEW", `      CREATING NEW TIMER ON AMID [${id}] `, {
      activity_manager_id: id,
    });

    await timer.save(trx);
    await Timer.addJob({
      name: "usertask",
      payload: {
        activityManagerId: id,
      },
      options: {
        jobId: id,
        delay: timeout * 1000,
        timerId: timer.id,
      },
    });
    emitter.emit("ACTIVITY_MANAGER.NEW_TIMER", `      NEW TIMER ON AMID [${id}] TIMER [${timer.id}]`, {
      activity_manager_id: id,
      timer_id: timer.id,
    });

    return timer.id;
  }
}

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
      if (is_allowed && activity_data?.parameters?.channels && activity_data?.parameters?.channels instanceof Array) {
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

  static async fetch(activity_manager_id, trx = false) {
    const activity_manager = await this.getPersist().getActivityDataFromId(activity_manager_id, trx);
    if (activity_manager) {
      activity_manager.activities = await this.getPersist().getActivities(activity_manager.id, trx);
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

        let timer = new Timer("ActivityManager", activity_manager_id, null, {});
        await timer.retrieve();

        if (timer._id) {
          result.expires_at = timer._expires_at;
        }
      }
    }
    return result;
  }

  static async addTimeInterval(activity_manager_id, timeInterval) {
    let timer = new Timer("ActivityManager", activity_manager_id, null, {});

    await timer.retrieve();
    if (timer._id) {
      const new_expired_date = new Date(timer.expires_at.setTime(timer.expires_at.getTime() + timeInterval * 1000));
      timer._expires_at = new_expired_date;

      await timer.updateExpiration();
    } else {
      timer._id = uuid();
      timer._expires_at = new Date(new Date().getTime() + timeInterval * 1000);
      await timer.save();
    }
  }

  static async setExpiredDate(activity_manager_id, date) {
    let timer = new Timer("ActivityManager", activity_manager_id, date, {});
    await timer.retrieve();

    if (timer._id) {
      timer._expires_at = new Date(date);
      await timer.updateExpiration();
    } else {
      await timer.save();
    }
  }

  static async interruptActivityManagerForProcess(process_id, trx) {
    const full_activity_manager_data = await this.getPersist().getActivityDataFromStatus(
      ActivityStatus.STARTED,
      {
        process_id: process_id,
      },
      trx
    );
    for (const activity_manager_data of full_activity_manager_data) {
      const activity_manager = ActivityManager.deserialize(activity_manager_data);
      activity_manager.activities = activity_manager_data.activities;
      await activity_manager.interruptActivity(process_id, trx);
    }
  }

  static async finishActivityManagerForProcess(process_id, trx = false) {
    const full_activity_manager_data = await this.getPersist().getActivityDataFromStatus(
      ActivityStatus.STARTED,
      {
        process_id: process_id,
      },
      trx
    );
    for (const activity_manager_data of full_activity_manager_data) {
      const activity_manager = ActivityManager.deserialize(activity_manager_data);
      activity_manager.activities = activity_manager_data.activities;
      await activity_manager._validateActivity(process_id, trx);
    }
  }

  static async createBoundaryEvents({ id, event }) {
    emitter.emit("ACTIVITY_MANAGER.CREATE_BOUNDARY_EVENT", `CREATE BOUNDARY EVENT ON AMID [${id}]`, {
      activity_manager: id,
    });
    if (event.input) {
      event.input["activityManagerId"] = id;
    } else {
      event.input = {
        activityManagerId: id,
      };
    }

    event.definition = "UserTask";
    event.resource = {
      id: id,
      type: "usertask",
    };
    const myEvent = new Events(event);
    const result = await myEvent.create();
    return result;
  }

  static async expire(activity_manager_id, data, params = {}, trx = false) {
    const activity_manager = ActivityManager.deserialize(data);
    activity_manager.status = ActivityStatus.COMPLETED;

    const activity = await new Activity(
      activity_manager_id,
      params.actor_data || {},
      { timer_id: data.parameters.timeout_id },
      ActivityStatus.STARTED
    ).save();

    activity_manager._activities.unshift(activity);
    await activity_manager.save(trx);

    emitter.emit("ACTIVITY_MANAGER.COMPLETED", `COMPLETED AMID [${activity_manager_id}]`, {
      activity_manager: activity_manager,
    });

    await activity_manager._notifyActivityManager(data.process_id);
    if (activity_manager.type === "commit") {
      await process_manager.continueProcess(
        data.process_id,
        {
          is_continue: true,
          activities: data.activities,
        },
        params.next_step_number || activity_manager._parameters.next_step_number,
        trx
      );
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
    if (!this._activities || this._activities.length === 0) {
      const timeout_id = await initTimeout({
        id: this._id,
        timeout: this._parameters.timeout,
        status: this._status,
        next_step_number: this._parameters.next_step_number,
        trx,
      });

      if (timeout_id) {
        this.parameters.timeout_id = timeout_id;
      }

      if (this._parameters?.events) {
        const eventsPromise = await this._parameters.events.map(async (event) =>
          ActivityManager.createBoundaryEvents({ id: this._id, event })
        );
        const eventsResult = await Promise.all(eventsPromise);
        this.parameters.timeout_id = eventsResult[0].data.timerId;
        this.parameters.timeout = eventsResult[0].delay;
      }
    }
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

  async interruptActivity(process_id, trx = false) {
    this._status = ActivityStatus.INTERRUPTED;
    await this.save(trx);
    await this._notifyActivityManager(process_id);
    return this;
  }

  async _validateActivity(process_id, trx = false) {
    //ToDo
    this._status = ActivityStatus.COMPLETED;
    await this.save(trx);
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

  async timeout(timer, trx) {
    emitter.emit("ACTIVITY_MANAGER.TIMEOUT_EXPIRED", `TIMEOUT ON AMID [${this.id}] TIMER [${timer.id}]`, {
      activity_manager_id: this.id,
      timer_id: timer.id,
    });

    const activity_manager_data = await ActivityManager.fetch(timer.resource_id, trx);
    if (
      activity_manager_data &&
      activity_manager_data.parameters.timeout_id === timer.id &&
      activity_manager_data.activity_status === ActivityStatus.STARTED
    ) {
      await ActivityManager.expire(
        this.id,
        activity_manager_data,
        { next_step_number: timer.params.next_step_number },
        trx
      );
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
