/* eslint-disable indent */
const { PersistedEntity } = require("./base");
const _ = require("lodash");
const { Queue } = require("bullmq");

const connection = {
  host: process.env.TIMER_HOST,
  port: process.env.TIMER_PORT,
};

class Timer extends PersistedEntity {
  static getEntityClass() {
    return Timer;
  }

  static serialize(timer) {
    return {
      id: timer._id,
      created_at: timer._created_at,
      expires_at: timer._expires_at,
      active: timer._active,
      resource_type: timer._resource_type,
      resource_id: timer._resource_id,
      params: timer._params,
      fired_at: timer._fired_at,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const timer = new Timer(
        serialized.resource_type,
        serialized.resource_id,
        serialized.expires_at,
        serialized.params
      );

      timer._id = serialized.id;
      timer._created_at = serialized.created_at;
      timer._active = serialized.active;
      timer._fired_at = serialized.fired_at;

      return timer;
    }
    return undefined;
  }

  static timeoutFromNow(seconds) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now;
  }

  static async fetchAllActive() {
    let query = Timer.getPersist().getAllActive();
    const timers = await query;
    return _.map(timers, (timer) => Timer.deserialize(timer));
  }

  static async fetchAllReady() {
    let query = Timer.getPersist().getAllReady();
    const timers = await query;
    return _.map(timers, (timer) => Timer.deserialize(timer));
  }

  static async addJob({ name, payload, options }) {
    if (process.env.TIMER_QUEUE) {
      const myQueue = new Queue(process.env.TIMER_QUEUE, { connection });
      return await myQueue.add(name, payload, options);
    }
    return undefined;
  }

  constructor(resource_type, resource_id, expires_at, params = {}) {
    super();

    this._resource_type = resource_type;
    this._resource_id = resource_id;
    this._expires_at = expires_at;
    this._active = true;
    this._params = params;
    this._fired_at = null;
  }

  get active() {
    return this._active;
  }

  get fired_at() {
    return this._fired_at;
  }

  get params() {
    return this._params;
  }

  get resource_type() {
    return this._resource_type;
  }

  get resource_id() {
    return this._resource_id;
  }

  async fetchResource() {
    try {
      switch (this._resource_type) {
        case "ActivityManager": {
          const { ActivityManager } = require("./activity_manager");
          return ActivityManager.deserialize(await ActivityManager.fetch(this.resource_id));
        }

        case "Process": {
          const { Process } = require("./process");
          return Process.fetch(this.resource_id);
        }

        case "Mock": {
          return Mock.fetch(this.resource_id);
        }
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  get expires_at() {
    return this._expires_at;
  }

  async run(trx = false) {
    // this._active = false;
    // this._fired_at = new Date();
    await this.delete(trx);

    const resource = await this.fetchResource();
    if (resource) {
      return resource.timeout(this, trx);
    }
  }

  async deactivate(trx = false) {
    this.getPersist().deactivate({ resource_type: this._resource_type, resource_id: this._resource_id, trx });
  }

  async retrieve() {
    const dbData = await this.getPersist().getByResource({
      resource_type: this._resource_type,
      resource_id: this._resource_id,
    });
    if (dbData) {
      this._id = dbData.id;
      this._expires_at = dbData.expires_at;
    } else {
      this._id = undefined;
    }
  }

  async updateExpiration() {
    const dbData = await this.getPersist().updateExpiration({ id: this._id, expires_at: this._expires_at });
    if (dbData.length > 0) {
      this._expires_at = dbData[0].expires_at;
      return dbData[0];
    }
  }
}

class Mock {
  static async fetch(id) {
    return new Mock(id);
  }

  constructor(id) {
    this.id = id;
  }

  async timeout(timer) {
    return timer;
  }
}

module.exports = {
  Timer: Timer,
};
