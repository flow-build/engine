const _ = require("lodash");
const { PersistedEntity } = require("./base");
const { Packages } = require("../workflow/packages");
const { ProcessState, ENGINE_ID } = require("./process_state");
const { ProcessStatus } = require("./process_state");
const { Blueprint } = require("../workflow/blueprint");
const { Lane } = require("../workflow/lanes");
const { Timer } = require("./timer");
const { getProcessStateNotifier, getActivityManagerNotifier } = require("../notifier_manager");
const { getAllowedStartNodes } = require("../utils/blueprint");
const { ActivityManager } = require("./activity_manager");
const { validateResult } = require("./../utils/ajvValidator.js");

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
      state: state ? state.serialize() : undefined,
      current_state_id: process._current_state_id,
      current_status: process._current_status
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const serialized_state = serialized.state;
      const state = ProcessState.deserialize(serialized_state);

      const process = new Process(
        {
          id: serialized.workflow_id,
          name: serialized.workflow_name,
        },
        serialized.blueprint_spec
      );
      process._id = serialized.id;
      process._created_at = serialized.created_at;
      process._state = state;
      process._current_state_id = serialized.current_state_id;
      process._current_status = serialized.current_status;

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

  static calculateNextStep(last_step_number) {
    return last_step_number + 1;
  }

  constructor(workflow_data, blueprint_spec) {
    super();

    this._workflow_id = workflow_data.id;
    this.workflow_name = workflow_data.name;
    this._blueprint_spec = blueprint_spec;
    this._blueprint = new Blueprint(this._blueprint_spec);
    this.state = null;
    this._current_state_id = null;
    this._current_status = null;
  }

  get state() {
    return this._state;
  }

  set state(s){
    this._state = s;
    if(s) {
      this._current_state_id = s.id;
      this._current_status = s.status;
    }
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
      this.state = new ProcessState(
        this._id,
        step_number,
        node.id,
        initial_bag,
        {},
        {},
        null,
        ProcessStatus.UNSTARTED,
        node.id,
        actor_data,
        null
      );
      await this.save();
      await this._notifyProcessState(actor_data);

      return this;
    }
  }

  async run(actor_data, execution_input) {
    console.log(`RUN ON PID ${this.id}`);

    this.state = await this.getPersist().getLastStateByProcess(this._id);
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
      if (node_result.error) {
        console.log(`ERROR ON PROCESS ${this.id} DATA ${this.workflow_name}: ${current_node._spec.name}`);
      }
      this.state = await this._createStateFromNodeResult(node_result, actor_data);
      await this.save();
      await this._notifyProcessState(actor_data);

      await this._executionLoop(custom_lisp, actor_data);

      return this;
    } else {
      return this._forbiddenState();
    }
  }

  async continue(result_data, actor_data, trx) {
    console.log(`CONTINUE ON PID ${this.id}`);
    if (!this.state) {
      this.state = await this.getPersist().getLastStateByProcess(this._id);
    }
    const current_node = this._blueprint.fetchNode(this._state.node_id);
    if (current_node && this.status !== ProcessStatus.FINISHED) {
      if (this.status !== ProcessStatus.RUNNING) {
        const next_node_id = current_node.next();
        const step_number = await this.getNextStepNumber();
        this.state = new ProcessState(
          this.id,
          step_number,
          current_node.id,
          this.bag,
          null,
          {
            ...this.state.result,
            ...result_data,
          },
          null,
          ProcessStatus.RUNNING,
          next_node_id,
          actor_data,
          null
        );
        await this.save(trx);
        await this._notifyProcessState({});
      }

      const custom_lisp = await Packages._fetchPackages(
        this._blueprint_spec.requirements,
        this._blueprint_spec.prepare
      );

      await this._executionLoop(custom_lisp, actor_data, trx);
    }
  }

  async runPendingProcess(actor_data, trx=false) {
    console.log(`RUN PENDING PID ${this.id}`);
    this.state = await this.getPersist().getLastStateByProcess(this._id);
    if (this.status !== ProcessStatus.PENDING) {
      throw new Error(`Process on invalid status ${this.status}`);
    }

    const node = this.next_node;
    if (!node) {
      throw new Error(`Node not found with id ${this._state.next_node_id}`);
    }

    const custom_lisp = await Packages._fetchPackages(
      this._blueprint_spec.requirements,
      this._blueprint_spec.prepare
    );

    this._state.status = ProcessStatus.RUNNING;
    return await this._executionLoop(custom_lisp, actor_data, trx);
  }

  async abort() {
    const next_step_number = await this.getNextStepNumber();
    this.state = new ProcessState(
      this._id,
      next_step_number,
      this._state.node_id,
      {},
      null,
      null,
      null,
      ProcessStatus.INTERRUPTED,
      null,
      null,
      null
    );

    await ActivityManager.interruptActivityManagerForProcess(this._id)
    await this.save();
    await this._notifyProcessState();

    return this;
  }

  async setState({ bag, result, next_node_id }) {
    if (this.status === ProcessStatus.FINISHED || this.status === ProcessStatus.INTERRUPTED) {
      throw new Error(`Process on invalid status ${this.status}`);
    }

    const step_number = Process.calculateNextStep(this.state.step_number);
    this.state = new ProcessState(
      this.id,
      step_number,
      this.state.node_id,
      bag,
      {},
      result,
      null,
      ProcessStatus.PENDING,
      next_node_id,
      null
    );
    this._current_state_id = this._state.id;
    await this.save();
    await this._notifyProcessState();

    return this;
  }

  async getNextStepNumber() {
    const last_step_number = await this.getPersist().getLastStepNumber(this._id);
    return Process.calculateNextStep(last_step_number);
  }

  async __inerLoop(current_state_id, { custom_lisp, actor_data }, trx) {
    const p_lock = await trx.select("id", "current_state_id")
      .from("process")
      .where("id", this.id)
      .where("current_state_id", current_state_id)
      .first()
      .forUpdate().noWait();
    if (!p_lock) {
      throw new Error(`No process found for lock, process_id ${this.id} current_state_id ${current_state_id}`);
    }
    console.log(`      LOCK PID ${p_lock.id}`);

    const ps_lock = await trx.select("id")
      .from("process_state").first()
      .where("id", current_state_id)
      .forUpdate().noWait();
    if (!ps_lock) {
      throw new Error(`No lock for process state ${current_state_id}`);
    }
    console.log(`      LOCK PID ${p_lock.id} PS ${ps_lock.id}`);

    const next_step_number = await this.getNextStepNumber();

    // console.log(`      START NODE WAIT ON PID ${this.id}`);
    // delay(1000);
    // console.log(`      END NODE WAIT PID ${this.id}`);

    console.log(`      START NODE RUN ${this.next_node._spec.type}:${this.next_node.category}:${this.next_node._spec.name} ON PID ${this.id}`)
    const node_result = await this._runNode(this.next_node, null, custom_lisp, actor_data);

    const result_state = await this._createStateFromNodeResult(node_result, actor_data, this.next_node._spec.result_schema);
    console.log(`      END NODE RUN STATUS ${node_result.status}`);

    if (result_state.step_number === next_step_number) {
      this.state = result_state;
      await this.save(trx);
      console.log(`      NEW STATE ON PID ${p_lock.id} PS ${this.state.id}`);

      await this._notifyProcessState(actor_data);

      if (result_state.status === ProcessStatus.PENDING && result_state.result.timeout) {
        // await trx('timer')
        // .where("resource_type", "Process")
        // .andWhere("resource_id", this.id)
        // .update({active: false});
        //
        // console.log(`      CLEARED TIMERS FOR PID ${this.id} `);

        console.log(`      CREATING NEW TIMER ON PID ${p_lock.id} `);
        const timer = new Timer("Process", this.id, Timer.timeoutFromNow(result_state.result.timeout), { actor_data });
        await timer.save(trx);
        console.log(`      NEW TIMER ON PID ${p_lock.id} TIMER ${timer.id}`);

      } else if (node_result.activity_manager) {
        console.log(`      CREATING NEW ACTIVITY MANAGER ON PID ${p_lock.id} `);
        const am = await this._createActivityManager(node_result.activity_manager, Process.calculateNextStep(next_step_number), trx, node_result.activity_schema);
        console.log(`      NEW ACTIVITY MANAGER ON PID ${p_lock.id} AM ${am.id}`);
      }

    } else {
      throw new Error(`Process ${this.id} on invalid step`);
    }
  }

  async _executionLoop(custom_lisp, actor_data, trx=false) {
    console.log(`CALLED EXECUTION LOOP PID ${this.id} STATUS ${this.status}`);
    let execution_success = true;
    while (execution_success && this.status === ProcessStatus.RUNNING) {
      const db = Process.getPersist()._db;

      try {
        await db.transaction(async (trx) => {
          console.log(`    BEGIN TRANSACTION FOR PID ${this.id} - ENGINE_ID ${ENGINE_ID}`);
          await this.__inerLoop.call(this, this._current_state_id, { custom_lisp, actor_data }, trx);
          console.log(`      COMMIT ON EXEC PID ${this.id} ON INNER LOOP - ENGINE_ID ${ENGINE_ID}`);
        });
      } catch (e) {
        execution_success = false;
        console.error(e);
        console.log(`      ROLLBACK ON EXEC PID ${this.id}  ON INNER LOOP - ENGINE_ID ${ENGINE_ID}`);
      }

      console.log(`  END LOOP PID ${this.id} STATUS ${this.status} EXECUTION SUCCESS ${execution_success}`);
    }
    console.log(`LEFT EXECUTION LOOP PID ${this.id} STATUS ${this.status}`);
  }

  async timeout(timer, trx=false){
    console.log(`TIMEOUT ON PID ${this.id} TIMER ${timer.id}`);
    await this.runPendingProcess(timer.params.actor_data);
  }

  async _notifyProcessState(actor_data) {
    const process_state_notifier = getProcessStateNotifier();
    if(process_state_notifier){
      await process_state_notifier({
        ...this.state.serialize(),
        workflow_name: this.workflow_name,
      }, actor_data);
    }
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

  async _createActivityManager(activity_manager, next_step_number, trx=false, activity_schema) {
      activity_manager.parameters.next_step_number = next_step_number;
      activity_manager.parameters.activity_schema = activity_schema;
      activity_manager.process_state_id = this._state.id;
      const am = await activity_manager.save(trx);
      await this._notifyActivityManager(activity_manager);
      return am;
  }

  async _createStateFromNodeResult({ node_id, bag, external_input, result,
    error, status, next_node_id, time_elapsed }, actor_data, result_schema = '') {
    const step_number = await this.getNextStepNumber();

    if (error) {
      this._errorState(error);
    }

    if (result_schema) {
      const resultSchemaError = validateResult(result_schema, result.data);
      if (resultSchemaError) {
      console.log(resultSchemaError);
        status = ProcessStatus.ERROR;
        error = resultSchemaError;
      }
    }

    return new ProcessState(
      this._id,
      step_number,
      node_id,
      bag,
      external_input,
      result,
      error,
      status,
      next_node_id,
      actor_data,
      time_elapsed
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
        result_schema: node._spec.result_schema
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

module.exports.Process = Process;
