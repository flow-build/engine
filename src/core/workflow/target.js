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
      process_state_id: target._process_state_id,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const target = new Target({
        signal: serialized.signal,
        resource_type: serialized.resource_type,
        resource_id: serialized.resource_id,
        process_state_id: serialized.process_state_id,
      });

      target._id = serialized.id;
      target._created_at = serialized.created_at;
      target._active = serialized.active;

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
      return new Target({
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
    this._process_state_id = params.process_state_id;
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

  get process_state_id() {
    return this._process_state_id;
  }

  get active() {
    return this._active;
  }

  async run(trx = false, params = {}) {
    switch(this.resource_type) {
      case 'workflow':
        let process;
        try {
          process = await createProcessByWorkflowId(this.resource_id, params.actor_data, {...params.input, trigger_process_id: params.process_id});
        } catch (e) {
          await this.getPersist().saveSignalRelation(trx, {
            target_id: this.id, 
            trigger_id: params.trigger_id,
            resolved: false
          })
          throw new Error('Error creating targeted process')
        }
        
        if(process.id) {
          await this.getPersist().saveSignalRelation(trx, {
            target_id: this.id, 
            trigger_id: params.trigger_id, 
            target_process_id: process.id,
            resolved: true
          })
          return process.run(params.actor_data, {});
        }
        
        await this.getPersist().saveSignalRelation(trx, {
          target_id: this.id, 
          trigger_id: params.trigger_id,
          resolved: false
        })

        return process
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
