/* eslint-disable indent */
const _ = require("lodash");
const { PersistedEntity } = require("./base");
const processDependency = require("./process");
const ajvValidator = require("../utils/ajvValidator");

class Switch extends PersistedEntity {
  static getEntityClass() {
    return Switch;
  }

  static async fetchByWorkflowId(...args) {
    return await this.getPersist().getByWorkflowId(...args);
  }

  static serialize(switch_) {
    return {
      id: switch_._id,
      created_at: switch_._created_at,
      active: switch_._active,
      opened_at: switch_.opened_at,
      closed_at: switch_.closed_at,
      workflow_id: switch_._workflow_id,
      node_id: switch_._node_id,
      opening_policy: switch_._opening_policy,
      closing_policy: switch_._closing_policy,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const switch_ = new Switch({
        workflow_id: serialized.workflow_id,
        node_id: serialized.node_id,
        opening_policy: serialized.opening_policy,
        closing_policy: serialized.closing_policy,
      });

      switch_._id = serialized.id;
      switch_._opened_at = serialized.opened_at;
      switch_._created_at = serialized.created_at;
      switch_._active = serialized.active;

      return switch_;
    }
    return undefined;
  }

  constructor(params = {}) {
    super();

    this._active = true;
    this._opened_at = Date.now();
    this._workflow_id = params.workflow_id;
    this._node_id = params.node_id;
    this._opening_policy = params.opening_policy;
    this._closing_policy = params.closing_policy;
  }

  get active() {
    return this._active;
  }

  get opened_at() {
    return this._opened_at;
  }

  get closed_at() {
    return this._closed_at;
  }

  get workflow_id() {
    return this._workflow_id
  }

  get node_id() {
    return this._node_id
  }

  get opening_policy() {
    return this._opening_policy
  }

  get closing_policy() {
    return this._closing_policy;
  }

  async validate(trx = false) {
    const target_node_id = this._node_id;
    const {
      timeout, 
      batch: validation_batch,
      result: expected_result,
      status: expected_status,
      successes: expected_successes,
    } = this._closing_policy;

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
    Switch: Switch,
};
