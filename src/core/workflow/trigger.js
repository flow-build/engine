/* eslint-disable indent */
const { PersistedEntity } = require("./base");
const _ = require("lodash");
const { createProcessByWorkflowName, runProcess } = require("./process_manager");
const { Target } = require("./target");

class Trigger extends PersistedEntity {
  static getEntityClass() {
    return Trigger;
  }

  static serialize(trigger) {
    return {
      id: trigger._id,
      created_at: trigger._created_at,
      active: trigger._active,
      signal: trigger._signal,
      input: trigger._input,
      actor_data: trigger._actor_data,
      process_id: trigger._process_id,
      target_process_id: trigger._target_process_id,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const trigger = new Trigger({
        signal: serialized.signal,
        input: serialized.input,
        actor_data: serialized.actor_data,
        process_id: serialized.process_id,
        target_process_id: serialized.target_process_id
      });

      trigger._id = serialized.id;
      trigger._created_at = serialized.created_at;
      trigger._active = serialized.active;
      trigger._actor_data = serialized.actor_data;
      trigger._process_id = serialized.process_id;

      return trigger;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();

    this._active = true;
    this._input = params.input;
    this._signal = params.signal;
    this._actor_data = params.actor_data;
    this._process_id = params.process_id;
    this._target_process_id = params.target_process_id;
  }

  get active() {
    return this._active;
  }

  get signal() {
    return this._signal;
  }

  get input() {
    return this._input;
  }

  get actor_data() {
    return this._actor_data
  }

  get process_id() {
    return this._process_id
  }

  get target_process_id() {
    return this._target_process_id
  }

  get expires_at() {
    return this._expires_at;
  }

  async _fetchWorkflowTargets(trx = false) {
    return await trx("target")
                  .select("*")
                  .where("active", true)
                  .where("signal", this.signal)
                  .where("resource_type", "workflow");
  }

  async _fetchProcessTargets(trx = false) {
    return await trx("target")
                  .select("*")
                  .where("active", true)
                  .where("signal", this.signal)
                  .where("resource_type", "process")
                  .where("resource_id", this.target_process_id);
  }

  async fetchTargets(trx) {
    if(this.target_process_id) {
      console.log('_fetchProcessTargets')
      return await this._fetchProcessTargets(trx)
    }
    console.log('_fetchWorkflowTargets')
    return await this._fetchWorkflowTargets(trx)
  }

  async run(trx = false) {
    this._active = false
    await this.save(trx);

    try {
      emitter.emit("ENGINE.TARGET_FETCHING", `FETCHING TARGET PROCESSES AS RESULT OF TRIGGER ${this.signal}`);  
      const targets = await this.fetchTargets(trx)
      if(targets.length) {
        return await Promise.all(targets.map(async (l_target) => {
          const target = await Target.validate_deserialize(l_target);
          if(target) {
            return target.run(trx, {
              actor_data: this.actor_data,
              input: this.input,
              process_id: this.process_id,
              trigger_id: this.id
            })
          }
        }))
      }
      return []
    } catch (e) {
      emitter.emit("ENGINE.TRIGGER.ERROR", "  ERROR FETCHING TARGET ON HEARTBEAT", { error: e });
      throw new Error(e);
    }
  }
}

module.exports = {
  Trigger: Trigger,
};
