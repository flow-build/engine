/* eslint-disable indent */
const _ = require("lodash");
const { PersistedEntity } = require("./base");
const processDependency = require("./process");
const ajvValidator = require("../utils/ajvValidator");

class Lock extends PersistedEntity {
  static getEntityClass() {
    return Lock;
  }

  static async fetchByWorkflowId(...args) {
    return await this.getPersist().getByWorkflowId(...args);
  }

  static serialize(lock) {
    return {
      id: lock._id,
      created_at: lock._created_at,
      active: lock._active,
      blocked_at: lock._blocked_at,
      released_at: lock._released_at,
      workflow_id: lock._workflow_id,
      node_id: lock._node_id,
      block_reason: lock._block_reason,
      release_condition: lock._release_condition,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const lock = new Lock({
        workflow_id: serialized.workflow_id,
        node_id: serialized.node_id,
        block_reason: serialized.block_reason,
        release_condition: serialized.release_condition,
      });

      lock._id = serialized.id;
      lock._blocked_at = serialized.blocked_at;
      lock._created_at = serialized.created_at;
      lock._active = serialized.active;

      return lock;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();

    this._active = true;
    this._blocked_at = Date.now();
    this._workflow_id = params.workflow_id;
    this._node_id = params.node_id;
    this._block_reason = params.block_reason;
    this._release_condition = params.release_condition;
  }

  get active() {
    return this._active;
  }

  get blocked_at() {
    return this._blocked_at;
  }

  get released_at() {
    return this._released_at;
  }

  get workflow_id() {
    return this._workflow_id
  }

  get node_id() {
    return this._node_id
  }

  get block_reason() {
    return this._block_reason
  }

  get release_condition() {
    return this._release_condition;
  }

  async validate(trx = false) {
    const { 
      timeout, 
      validation_batch,
      node_id: target_node_id,
      expected_result,
      expected_status,
      expected_successes,
    } = this._release_condition;

    const registered_processes = await trx("process")
      .select("*")
      .where("process.current_status", "running")
      .where("process.workflow_id", this._workflow_id)
      .limit(validation_batch)
      .forUpdate()
      .skipLocked();

    await Promise.all(registered_processes.map(async(serialized_process) => {
      if(serialized_process) {
        const process = await processDependency.Process.fetch(serialized_process.id);
        const skipLock = true;
        return process.continue({}, process.state._actor_data, trx, skipLock);
      }
    }));

    await trx.commit();

    if(registered_processes.length) {
      setTimeout(async () => {
        const results = await Promise.all(registered_processes.map(async(serialized_process) => {
          const process_history = await processDependency.Process.fetchStateHistory(serialized_process.id);
          const target_state = process_history.find(ps => ps._node_id === target_node_id);
          
          if(!target_state) {
            return { is_valid: false };
          };
    
          if(target_state._status !== expected_status) {
            return { is_valid: false };
          };
    
          try {
            ajvValidator.validateResult(expected_result, target_state._result);
            return { is_valid: true };
          } catch(err) {
            return { is_valid: false };
          }
        }));
    
        const valid_responses = results.filter(r => r.is_valid); 
        if(valid_responses.length >= expected_successes) {
          this._active = false;
          await this.save();
        }
      }, timeout);
    };
  }
}

module.exports = {
    Lock: Lock,
};
