/* eslint-disable indent */
const { PersistedEntity } = require("./base");
const _ = require("lodash");
const { createProcessByWorkflowName, runProcess } = require("../workflow/process_manager");

class Signal extends PersistedEntity {
  static getEntityClass() {
    return Signal;
  }

  static serialize(signal) {
    return {
      id: signal._id,
      created_at: signal._created_at,
      active: signal._active,
      params: signal._params,
      fired_at: signal._fired_at,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const signal = new Signal(
        serialized.params
      );

      signal._id = serialized.id;
      signal._created_at = serialized.created_at;
      signal._active = serialized.active;
      signal._fired_at = serialized.fired_at;

      return signal;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();

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

  get expires_at() {
    return this._expires_at;
  }

  async run(trx = false) {
    await this.delete(trx);

    const process = await createProcessByWorkflowName(this.params.next_workflow_name, this.params.actor_data, this.params.initial_bag)
    runProcess(process.id, this.params.actor_data, {})
  }
}

module.exports = {
    Signal: Signal,
};
