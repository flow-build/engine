/* eslint-disable indent */
const { PersistedEntity } = require("./base");
const _ = require("lodash");
const { fetchLatestWorkflowVersionById, createProcessByWorkflowId, continueProcess } = require("./process_manager");

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
      resource_type: target._resource_type,
      resource_id: target._resource_id,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const target = new Target({
        signal: serialized.signal,
        resource_type: serialized.resource_type,
        resource_id: serialized.resource_id
      });

      return target;
    }
    return undefined;
  }

  static async validate_deserialize(serialized) {
    const workflow = await fetchLatestWorkflowVersionById(serialized.resource_id);
    const [start_node] = workflow.blueprint_spec.nodes
    if (start_node.category === 'signal') {
      return Target.deserialize(serialized)
    }
    return undefined;
  }

  static target_workflow_creation(workflow) {
    const [start_node] = workflow.blueprint_spec.nodes
    if(start_node.category === 'signal') {
      return Target.deserialize({
        signal: start_node.parameters.signal,
        resource_type: 'workflow',
        resource_id: workflow.id
      })
    }
    return undefined
  }

  constructor(params = {}) {
    super();
    this._signal = params.signal;
    this._resource_type = params.resource_type;
    this._resource_id = params.resource_id;
  }

  get signal() {
    return this._signal;
  }

  get resource_type() {
    return this._resource_type;
  }

  get resource_id() {
    return this._resource_id;
  }

  get active() {
    return this._active;
  }

  async run(params = {}) {
    switch(this.resource_type) {
      case 'workflow':
        const process = await createProcessByWorkflowId(this.resource_id, params.actor_data, {...params.input, trigger_process_id: params.process_id});
        return process.run(params.actor_data, {});
      // 'process' case has to be reviewed
      case 'process':
        return continueProcess(this.resource_id, {...params.input, trigger_process_id: params.process_id}, undefined, params.actor_data);
      default:
        throw new Error('Invalid resource for Target')
    }
  }
}

module.exports = {
  Target: Target,
};
