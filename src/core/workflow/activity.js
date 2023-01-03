const _ = require('lodash');
const { PersistedEntity } = require("./base");

class ActivityStatus {
  static get STARTED() {
    return "started";
  }
  static get COMPLETED() {
    return "completed";
  }
  static get ERROR() {
    return "error";
  }
  static get INTERRUPTED() {
    return "interrupted";
  }
}

class Activity extends PersistedEntity {

  static getEntityClass() {
    return Activity;
  }

  static serialize(activity) {
    if(activity._data && !_.isObject(activity._data)){
      throw new Error('invalid input syntax for type json');
    }

    return {
      id: activity._id,
      created_at: activity._created_at,
      activity_manager_id: activity.activity_manager_id,
      actor_data: activity._actor_data,
      data: activity._data,
      status: activity._status,
      extra_fields: activity?._extra_fields,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      if(_.isString(serialized.data)){
        serialized.data = JSON.parse(serialized.data);
        serialized.actor_data = JSON.parse(serialized.actor_data);
      }
      const activity = new Activity(
        serialized.activity_manager_id,
        serialized.actor_data,
        serialized.data,
        serialized.status,
        _.isString(serialized?.extra_fields) ? JSON.parse(serialized?.extra_fields) : serialized?.extra_fields);
      activity._id = serialized.id;
      activity._created_at = serialized.created_at;

      return activity;
    }
    return undefined;
  }

  constructor(activity_manager_id, actor_data, data, status) {
    super();

    this._process_state_id = activity_manager_id;
    this._actor_data = actor_data;
    this._data = data;
    this._status = status;
  }

  get activity_manager_id() {
    return this._process_state_id;
  }

  get actor_data() {
    return this._actor_data;
  }

  get data() {
    return this._data;
  }

  get status() {
    return this._status;
  }
}

module.exports = {
  ActivityStatus: ActivityStatus,
  Activity: Activity
};
