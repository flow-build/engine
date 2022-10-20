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
      fired_at: trigger._fired_at,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const trigger = new Trigger({
        signal: serialized.signal,
        input: serialized.input
      });

      trigger._id = serialized.id;
      trigger._created_at = serialized.created_at;
      trigger._active = serialized.active;
      trigger._fired_at = serialized.fired_at;

      return trigger;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();

    this._active = true;
    this._input = params.input;
    this._signal = params.signal;
    this._fired_at = null;
  }

  get active() {
    return this._active;
  }

  get fired_at() {
    return this._fired_at;
  }

  get signal() {
    return this._signal;
  }

  get input() {
    return this._input;
  }

  get expires_at() {
    return this._expires_at;
  }

  async run(trx = false) {    
    this._active = false
    await this.save(trx);
    
    try {
      emitter.emit("ENGINE.TARGET_FETCHING", `FETCHING TARGET PROCESSES AS RESULT OF TRIGGER ${this.signal}`);
      const targets = await trx("target")
        .select("*")
        .where("active", true)
        .where("signal", this.signal);
      return await Promise.all(targets.map((l_target) => {
        const target = Target.deserialize(l_target);
        return target.run({
          actor_data: this.input.actor_data,
          initial_bag: this.input.initial_bag
        })
      }))
    } catch (e) {
      emitter.emit("ENGINE.TRIGGER.ERROR", "  ERROR FETCHING TARGET ON HEARTBEAT", { error: e });
      throw new Error(e);
    }

    // const process = await createProcessByWorkflowName(this.input.next_workflow_name, this.input.actor_data, this.input.initial_bag)
    // runProcess(process.id, this.input.actor_data, {})
  }
}

module.exports = {
  Trigger: Trigger,
};
