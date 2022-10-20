/* eslint-disable indent */
const { PersistedEntity } = require("./base");
const _ = require("lodash");
const { createProcessByWorkflowName, runProcess } = require("./process_manager");

class Target extends PersistedEntity {
  static getEntityClass() {
    return Target;
  }

  static serialize(target) {
    return {
      id: target._id,
      created_at: target._created_at,
      active: target._active,
      signal: target._signal,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const target = new Target({
        signal: serialized.signal,
        workflow_name: serialized.workflow_name
      });

      return target;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();
    this._signal = params.signal;
    this._workflow_name = params.workflow_name;
  }

  get signal() {
    return this._signal;
  }

  get workflow_name() {
    return this._workflow_name;
  }

  get active() {
    return this._active;
  }

  async run(params = {}) {
    const process = await createProcessByWorkflowName(this.workflow_name, params.actor_data, params.initial_bag)
    runProcess(process.id, params.actor_data, {})
  }
}

module.exports = {
  Target: Target,
};
