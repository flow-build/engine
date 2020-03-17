const _ = require("lodash");
const { PersistedEntity } = require("./base");
const { Packages } = require("../workflow/packages");
const { ProcessState } = require("./process_state");
const { ProcessStatus } = require("./process_state");
const { Blueprint } = require("../workflow/blueprint");
const { Lane } = require("../workflow/lanes");
const { getProcessStateNotifier, getActivityManagerNotifier } = require("../notifier_manager");
const { getAllowedStartNodes } = require("../utils/blueprint");

class Process extends PersistedEntity {

  static getEntityClass() {
    return Process;
  }

  static serialize(process) {
    const state = process.state;
    return {
      id: process.id,
      created_at: process._created_at,
      workflow_id: process._workflow_id,
      blueprint_spec: process._blueprint_spec,
      state: state ? state.serialize() : undefined
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const serialized_state = serialized.state;
      const state = ProcessState.deserialize(serialized_state);

      const process = new Process(
        serialized.workflow_id,
        serialized.blueprint_spec);
      process._id = serialized.id;
      process._created_at = serialized.created_at;
      process._state = state;

      return process;
    }
    return undefined;
  }

  static async fetchAll(filters) {
    const processes = await this.getPersist().getAll(filters);
    return _.map(processes, process => Process.deserialize(process));
  }

  static async fetchStateHistory(process_id) {
    const states = await this.getPersist().getStateHistoryByProcess(process_id);
    return _.map(states, state => ProcessState.deserialize(state));
  }

  constructor(workflow_id, blueprint_spec) {
    super();

    this._workflow_id = workflow_id;
    this._blueprint_spec = blueprint_spec;
    this._blueprint = new Blueprint(this._blueprint_spec);
    this._state = null;
  }

  get state() {
    return this._state;
  }

  get status() {
    return this._state.status;
  }

  get bag() {
    return this._state.bag;
  }

  get next_node() {
    return this._blueprint.fetchNode(this._state.next_node_id);
  }

  async create(actor_data, initial_bag) {
    const custom_lisp = await Packages._fetchPackages(
      this._blueprint_spec.requirements,
      this._blueprint_spec.prepare
    );

    const valid_start_nodes = getAllowedStartNodes(this._blueprint_spec, actor_data, initial_bag, custom_lisp);
    if (valid_start_nodes.length === 0) {
      return this._forbiddenState();
    } else if (valid_start_nodes.length > 1) {
      return this._errorState('Multiple start nodes');
    } else {
      const node = valid_start_nodes[0];
      const step_number = await this.getNextStepNumber();
      this._state = new ProcessState(
        this._id,
        step_number,
        node.id,
        initial_bag,
        {},
        {},
        null,
        ProcessStatus.UNSTARTED,
        node.id
      );
      await this.save();
      await this._notifyProcessState();

      return this;
    }
  }

  async run(actor_data, execution_input) {
    this._state = await this.getPersist().getLastStateByProcess(this._id);
    const current_node = this._blueprint.fetchNode(this._state.node_id);
    let external_input;
    if (this.status === ProcessStatus.WAITING) {
      external_input = execution_input;
    } else if (this.status === ProcessStatus.UNSTARTED) {
      external_input = {};
    } else {
      return this._forbiddenState();
    }

    const custom_lisp = await Packages._fetchPackages(
      this._blueprint_spec.requirements,
      this._blueprint_spec.prepare
    );
    const is_lane_valid = await this._validateLaneRuleForNode(current_node, actor_data, this.bag, custom_lisp);
    if (is_lane_valid) {
      const node_result = await this._runNode(current_node, external_input, custom_lisp, actor_data);
      this._state = await this._createStateFromNodeResult(node_result);
      await this.save();
      await this._notifyProcessState();

      while (this.status === ProcessStatus.RUNNING) {
        const node_result = await this._runNode(this.next_node, null, custom_lisp, actor_data);
        this._state = await this._createStateFromNodeResult(node_result);
        await this.save();
        await this._notifyProcessState();
        await this._createActivityManager(node_result);
      }

      return this;
    } else {
      return this._forbiddenState();
    }
  }

  async abort(actor_data) {
    const next_step_number = await this.getNextStepNumber();
    this._state = new ProcessState(
      this._id,
      next_step_number,
      this._state.node_id,
      {},
      null,
      null,
      null,
      ProcessStatus.INTERRUPTED,
      null,
    );
    await this.save();

    return this;
  }

  async setState(actor_data, process_state_data) {
    this._state = new ProcessState(
      this.id,
      process_state_data.step_number,
      process_state_data.node_id,
      process_state_data.bag,
      process_state_data.external_input,
      process_state_data.result,
      process_state_data.error,
      process_state_data.status,
      process_state_data.next_node_id,
    );
    await this.save();

    return this;
  }

  async getNextStepNumber() {
    return await this.getPersist().getNextStepNumber(this._id);
  }

  async _notifyProcessState() {
    const process_state_notifier = getProcessStateNotifier() || function () { };
    await process_state_notifier(this.state)
  }

  async _notifyActivityManager(activity_manager) {
    const activity_manager_notifier = getActivityManagerNotifier();
    if (activity_manager_notifier) {
      await activity_manager_notifier({
        ...activity_manager,
        _process_id: this.id
      });
    }
  }

  async _createActivityManager(node_result) {
    if (node_result.activity_manager) {
      const activity_manager = node_result.activity_manager;
      activity_manager.process_state_id = this._state.id;
      await activity_manager.save();
      await this._notifyActivityManager(activity_manager);
    }
  }

  async _createStateFromNodeResult({ node_id, bag, external_input, result,
    error, status, next_node_id }) {
    const step_number = await this.getNextStepNumber();
    return new ProcessState(
      this._id,
      step_number,
      node_id,
      bag,
      external_input,
      result,
      error,
      status,
      next_node_id
    );
  }

  async _runNode(node, external_input, custom_lisp, actor_data) {
    return await node.run(
      {
        bag: this.bag,
        input: this._state.result,
        external_input: external_input,
        actor_data: actor_data,
        environment: this._blueprint_spec.environment,
      },
      custom_lisp
    );
  }

  async _validateLaneRuleForNode(node, actor_data, bag, custom_lisp) {
    const blueprint = this._blueprint_spec;
    const lane_id = node._spec.lane_id;
    const lane_spec = blueprint.lanes.filter((lane) => lane.id === lane_id)[0];
    return Lane.runRule(lane_spec, actor_data, bag, custom_lisp);
  }

  _forbiddenState() {
    const forbidden_status = ProcessStatus.FORBIDDEN;
    const state = { status: forbidden_status, state: { ...this._state } };
    state.state.status = forbidden_status;
    return state;
  }

  _errorState(error) {
    const error_status = ProcessStatus.ERROR;
    const process = { status: error_status, state: { status: error_status, error: error } };
    return process;
  }
}

module.exports = {
  Process: Process
};
