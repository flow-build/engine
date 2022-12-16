/* eslint-disable indent */
require("dotenv").config();
const _ = require("lodash");
const { PersistedEntity } = require("./base");
const { getMobileNodes } = require('../utils/node_factory')
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
const process_manager = require("../../core/workflow/process_manager.js");
const emitter = require("../utils/emitter");

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
      current_status: process._current_status,
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
        _.isString(serialized.blueprint_spec) ? JSON.parse(serialized.blueprint_spec) : serialized.blueprint_spec
      );
      process._id = serialized.id;
      process._created_at = new Date(serialized.created_at);
      process._state = state;
      process._current_state_id = serialized.current_state_id;
      process._current_status = serialized.current_status;
      process._workflow = {
        name: serialized.workflow_name,
        version: serialized.workflow_version,
        isLatest: serialized.latest_version,
      };

      return process;
    }
    return undefined;
  }

  static async fetchAll(filters) {
    const filtersSchema = {
      type: "object",
      properties: {
        workflow_name: {
          oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
        },
        workflow_id: {
          oneOf: [
            { type: "string", format: "uuid" },
            { type: "array", items: { type: "string", format: "uuid" } },
          ],
        },
        process_id: {
          oneOf: [
            { type: "string", format: "uuid" },
            { type: "array", items: { type: "string", format: "uuid" } },
          ],
        },
        current_status: {
          oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
        },
        limit: { type: "integer" },
        offset: { type: "integer" },
      },
    };

    if (filters) {
      const validationErrors = validateResult(filtersSchema, filters);
      if (validationErrors) {
        return { error: validationErrors.message };
      }
      filters["process.id"] = filters.process_id;
      filters["name"] = filters.workflow_name;
    }

    const processes = await this.getPersist().getAll(filters);
    return _.map(processes, (process) => Process.deserialize(process));
  }

  static async fetchStateHistory(process_id) {
    const states = await this.getPersist().getStateHistoryByProcess(process_id);
    return _.map(states, (state) => ProcessState.deserialize(state));
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

  set state(s) {
    this._state = s;
    if (s) {
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

  get workflow_id() {
    return this._workflow_id;
  }

  get blueprint_spec() {
    return this._blueprint_spec;
  }

  get current_state_id() {
    return this._current_state_id;
  }

  get current_status() {
    return this._current_status;
  }

  set current_status(status) {
    this._current_status = status;
  }

  set current_state_id(id) {
    this._current_state_id = id;
  }

  get offline(){
    return Process.connection_status === ProcessStatus.UNAVAILABLE;
  }

  async create(actor_data, initial_bag) {
    Blueprint.assert_is_valid(this._blueprint_spec);

    const custom_lisp = await Packages._fetchPackages(this._blueprint_spec.requirements, this._blueprint_spec.prepare);

    const valid_start_nodes = getAllowedStartNodes(this._blueprint_spec, actor_data, initial_bag, custom_lisp);
    if (valid_start_nodes.length === 0) {
      return this._forbiddenState();
    } else if (valid_start_nodes.length > 1) {
      return this._errorState("Multiple start nodes");
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
    emitter.emit("PROCESS.RUN", `RUN ON PID [${this.id}]`, { process_id: this.id });

    this.state = await this.getPersist().getLastStateByProcess(this._id);
    let currentNode;

    try {
      currentNode = this._blueprint.fetchNode(this._state.node_id);
    } catch (err) {
      return this._forbiddenState(err);
    }

    let external_input;
    if (this.status === ProcessStatus.WAITING || this.status === ProcessStatus.DELEGATED) {
      external_input = execution_input;
    } else if (this.status === ProcessStatus.UNSTARTED) {
      external_input = {};
    } else if (this.status === ProcessStatus.ERROR) {
      return this._errorState("Error");
    } else {
      return this._forbiddenState();
    }

    const custom_lisp = await Packages._fetchPackages(this._blueprint_spec.requirements, this._blueprint_spec.prepare);
    const is_lane_valid = await this._validateLaneRuleForNode(currentNode, actor_data, this.bag, custom_lisp);
    if (is_lane_valid) {
      const node_result = await this._runNode(currentNode, external_input, custom_lisp, actor_data);
      if (node_result.error) {
        emitter.emit(
          "PROCESS.EDGE.ERROR",
          `ERROR ON PROCESS PID [${this.id}] DATA [${this.workflow_name}]:[${currentNode._spec.name}]`,
          {
            process_id: this.id,
            workflow_name: this.workflow_name,
            node_id: currentNode._spec.id,
            node_name: currentNode._spec.name,
          }
        );
      }
      this.state = await this._createStateFromNodeResult(node_result, actor_data);
      await this.save();
      await this._notifyProcessState(actor_data);

      if (
        this.state.status === ProcessStatus.RUNNING &&
        this.state.step_number === 2 &&
        this.state.result &&
        this.state.result.timeout
      ) {
        emitter.emit("PROCESS.TIMER.CREATING", `  CREATING PROCESS TIMER ON PID [${this.id}]`, { process_id: this.id });
        let timer = new Timer("Process", this.id, Timer.timeoutFromNow(this.state.result.timeout), { actor_data });
        await timer.save();
        emitter.emit("PROCESS.TIMER.NEW", `  PROCESS TIMER ON PID [${this.id}] TIMER [${timer.id}]`, {
          process_id: this.id,
          timer_id: timer.id,
        });
      }

      await this._executionLoop(custom_lisp, actor_data);

      if (this._current_status === ProcessStatus.DELEGATED) {
        currentNode = this._blueprint.fetchNode(this._state.node_id);
        this.parameters = currentNode._spec.parameters;
      }
      return this;
    } else {
      return this._forbiddenState();
    }
  }

  async continue(result_data, actor_data, trx) {
    emitter.emit("PROCESS.CONTINUE", `CONTINUE ON PID [${this.id}]`, { process_id: this.id });
    if (!this.state) {
      this.state = await this.getPersist().getLastStateByProcess(this._id);
    }
    let currentNode;

    try {
      currentNode = this._blueprint.fetchNode(this._state.node_id);
    } catch (err) {
      return this._forbiddenState(err);
    }

    if (currentNode && this.status !== ProcessStatus.FINISHED && this.status !== ProcessStatus.UNAVAILABLE) {
      if (this.status !== ProcessStatus.RUNNING) {
        const next_node_id = currentNode.next();
        const step_number = await this.getNextStepNumber();
        this.state = new ProcessState(
          this.id,
          step_number,
          currentNode.id,
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
        await this.save();
        await this._notifyProcessState({});
      }

      const custom_lisp = await Packages._fetchPackages(
        this._blueprint_spec.requirements,
        this._blueprint_spec.prepare
      );

      await this._executionLoop(custom_lisp, actor_data, trx);
    }
  }

  async runPendingProcess(actor_data, trx = false) {
    emitter.emit("PROCESS.RUN_PENDING", `RUN PENDING PID [${this.id}]`, { process_id: this.id });
    this.state = await this.getPersist().getLastStateByProcess(this._id);
    if (this.status !== ProcessStatus.PENDING) {
      throw new Error(`Process on invalid status ${this.status}`);
    }

    const node = this.next_node;
    if (!node) {
      throw new Error(`Node not found with id ${this._state.next_node_id}`);
    }

    const custom_lisp = await Packages._fetchPackages(this._blueprint_spec.requirements, this._blueprint_spec.prepare);

    this._state.status = ProcessStatus.RUNNING;
    return await this._executionLoop(custom_lisp, actor_data, trx);
  }

  async expireProcess(trx = false) {
    emitter.emit("PROCESS.EDGE.EXPIRING", `EXPIRE PID [${this.id}]`, { process_id: this.id });
    const next_step_number = await this.getNextStepNumber();
    this.state = new ProcessState(
      this._id,
      next_step_number,
      this._state.node_id,
      {},
      null,
      null,
      null,
      ProcessStatus.EXPIRED,
      null,
      null,
      null
    );

    await ActivityManager.interruptActivityManagerForProcess(this._id);
    await this.save(trx);
    await this._notifyProcessState();

    return this;
  }

  async abort() {
    emitter.emit("PROCESS.EDGE.ABORTING", `ABORT PID [${this.id}]`, { process_id: this.id });
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

    await ActivityManager.interruptActivityManagerForProcess(this._id);
    await this.save();
    await this._notifyProcessState();

    return this;
  }

  async setState({ bag, result, next_node_id }) {
    emitter.emit("PROCESS.STATE.SET", `SET STATE ON PID [${this.id}]`, {
      process_id: this.id,
    });

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

  async setStateUnavailable({ node_id, bag, result, error, next_node_id,
                              actor_data, time_elapsed }, trx = false){

    const step_number = Process.calculateNextStep(this.state.step_number);

    this.state = new ProcessState(
        this.id,
        step_number,
        node_id,
        bag,
        {},
        result,
        error,
        ProcessStatus.UNAVAILABLE,
        next_node_id,
        actor_data,
        time_elapsed
    );
    this._current_state_id = this._state.id;
    await this.save(trx);
    await this._notifyProcessState();

    return this.state;
  }

  async getNextStepNumber() {
    const last_step_number = await this.getPersist().getLastStepNumber(this._id);
    return Process.calculateNextStep(last_step_number);
  }

  async __inerLoop(current_state_id, { custom_lisp, actor_data }, trx) {
    const p_lock = trx
      .select("id", "current_state_id")
      .from("process")
      .where("id", this.id)
      .where("current_state_id", current_state_id)
      .first();

    const SQLite = (trx.client.config.dialect || trx.context.client.config.client) === "sqlite3";
    
    let process_lock;
    if(!SQLite){
      process_lock = await p_lock.forUpdate().noWait();
    } else {
      process_lock = await p_lock;
    }

    if (!process_lock) {
      throw new Error(`No process found for lock, process_id [${this.id}] current_state_id [${current_state_id}]`);
    }
    emitter.emit("INNERLOOP.LOCK", `      LOCK PID ${process_lock.id}`, {
      process_id: process_lock.id,
    });

    const ps_lock = trx
      .select("id")
      .from("process_state")
      .first()
      .where("id", current_state_id);

    let process_state_lock;
    if(!SQLite){
      process_state_lock = await ps_lock.forUpdate().noWait();
    } else {
      process_state_lock = await ps_lock;
    }

    if (!process_state_lock) {
      throw new Error(`No lock for process state [${current_state_id}]`);
    }
    emitter.emit("INNERLOOP.STATE_LOCK", `      LOCK PID [${process_lock.id}] PS [${process_state_lock.id}]`, {
      process_id: process_lock.id,
      process_state_id: process_state_lock.id,
    });

    const next_step_number = await this.getNextStepNumber();
    let max_step_number;

    if (process.env.MAX_STEP_NUMBER || (this._blueprint._spec.parameters || {}).max_step_number) {
      max_step_number = parseInt(process.env.MAX_STEP_NUMBER);

      if ((this._blueprint._spec.parameters || {}).max_step_number) {
        max_step_number = parseInt(this._blueprint._spec.parameters.max_step_number);
      }

      if (next_step_number === max_step_number) {
        await this.expireProcess(trx);
        return [this.state, {}, {}];
      }
    }

    let am = null;
    let timer = null;

    if (!SQLite) {
      try {
        this.next_node;
      } catch (error) {
        this.state = new ProcessState(
          this._state.process_id,
          next_step_number,
          this._state.node_id,
          this._state.bag,
          this._state.external_input,
          this._state.result,
          error.toString(),
          ProcessStatus.FORBIDDEN,
          this._state.next_node_id,
          this._state.actor_data,
          null
        );

        await this._notifyProcessState(actor_data);
        await this.save(trx);

        return [this, null, null];
      }
    } else {
      const nodes = getMobileNodes();
      const type = (_.get(this.next_node, ['_spec', 'type'])).toLowerCase() === "systemtask"

      if(type) {

        const category = _.get(this.next_node, ['_spec', 'category'])
        const available = nodes.includes(category.toLowerCase())

        if(!available) {
          const state = await this.setStateUnavailable(this.state, trx);
          emitter.emit('PROCESS.UNAVAILABLE', this)
          return [state, am, timer];
        }
      }
    }

    emitter.emit(
      "PROCESS.START_NODE_RUN",
      `      START NODE RUN [${this.next_node._spec.type}]:[${this.next_node._spec.category}]:[${this.next_node._spec.name}] ON PID ${this.id}`,
      {
        process_id: this.id,
        node_type: this.next_node._spec.type,
        node_category: this.next_node._spec.category,
        node_name: this.next_node._spec.name,
      }
    );
    const node_result = await this._runNode(this.next_node, null, custom_lisp, actor_data);

    let result_state;
    if (!this.IsJsonString(node_result.result)) {
      emitter.emit(
        "PROCESS.EDGE.NODE_RESULT_ERROR",
        `NODE RESULT FROM NODE ID [${this.next_node._spec.id}] IS A INVALID JSON ON PID [${this.id}]`,
        {
          process_id: this.id,
          node_id: this.next_node._spec.id,
          node_name: this.next_node._spec.name,
        }
      );

      const node_result_error = { ...node_result, result: {}, error: "Node Result is invalid" };

      result_state = await this._createStateFromNodeResult(
        node_result_error,
        actor_data,
        this.next_node._spec.result_schema
      );
    } else {
      result_state = await this._createStateFromNodeResult(node_result, actor_data, this.next_node._spec.result_schema);
    }

    emitter.emit("PROCESS.END_NODE_RUN", `      END NODE RUN STATUS [${node_result.status}]`, {
      process_id: this.id,
      node_name: this.next_node._spec.name,
      node_status: node_result.status,
    });

    if (result_state.step_number === next_step_number) {
      this.state = result_state;
      await this.save(trx);
      emitter.emit("PROCESS_STATE.NEW", `      NEW STATE ON PID [${process_lock.id}] PS [${this.state.id}]`, {
        process_id: this.id,
        process_state_id: this.state.id,
      });

      await this._notifyProcessState(actor_data);

      if (
        (result_state.status === ProcessStatus.PENDING || result_state.status === ProcessStatus.WAITING) 
          && result_state.result.timeout) 
          {
        emitter.emit("PROCESS.TIMER.CREATING", `      CREATING NEW TIMER ON PID [${process_lock.id}]`, {
          process_id: process_lock.id,
        });

        timer = new Timer("Process", this.id, Timer.timeoutFromNow(result_state.result.timeout), { actor_data });
        await timer.save(trx);
        emitter.emit("PROCESS.TIMER.NEW", `      NEW TIMER ON PID [${process_lock.id}] TIMER [${timer.id}]`, {
          process_id: this.id,
          timer_id: timer.id,
        });
      } else if (node_result.activity_manager) {
        emitter.emit("PROCESS.AM.CREATING", `      CREATING NEW ACTIVITY MANAGER ON PID [${process_lock.id}]`, {
          process_id: process_lock.id,
        });

        am = await this._createActivityManager(
          node_result.activity_manager,
          Process.calculateNextStep(next_step_number),
          trx,
          node_result.activity_schema
        );

        emitter.emit("PROCESS.AM.NEW", `      NEW ACTIVITY MANAGER ON PID [${process_lock.id}] AM [${am.id}]`, {
          process_id: process_lock.id,
          activity_manager_id: am.id,
        });
      } else if (result_state.status === ProcessStatus.DELEGATED) {
        emitter.emit("PROCESS.SUBPROCESS.CREATING", `      CREATING NEW SUBPROCESS ON PID [${process_lock.id}]`, {
          process_id: process_lock.id,
          sub_workflow_name: node_result.workflow_name,
        });
        const initial_bag = result_state.result;
        const parent_data = {
          id: this.id,
          expected_step_number: result_state.step_number,
        };
        initial_bag.parent_process_data = parent_data;
        const child_process = await process_manager.createProcessByWorkflowName(
          node_result.workflow_name,
          node_result.actor_data,
          initial_bag
        );
        if (child_process.status === ProcessStatus.UNSTARTED) {
          emitter.emit("PROCESS.SUBPROCESS.NEW", `NEW SUBPROCESS ON PID [${process_lock.id}] SPID [${child_process.id}]`, {
            process_id: process_lock.id,
            sub_process_id: child_process.id,
          });

          process_manager.runProcess(child_process.id, node_result.actor_data, {});
        } else {
          throw new Error(`ERROR CREATING SUBPROCESS`);
        }
      } else if (result_state.status === ProcessStatus.FINISHED) {
        emitter.emit("PROCESS.FINISHED", `      FINISHED PID [${process_lock.id}]`, {
          process_id: process_lock.id,
          result_data: result_state.result,
        });
        if (result_state.bag.parent_process_data) {
          emitter.emit(
            "PROCESS.SUBPROCESS.UPSTREAM",
            `      SUBPROCESS UPSTREAM ON PID [${process_lock.id}] PPID [${result_state.bag.parent_process_data.id}]`,
            {
              process_id: process_lock.id,
              parent_process_id: result_state.bag.parent_process_data.id,
            }
          );
          process_manager.continueProcess(
            result_state.bag.parent_process_data.id,
            { data: result_state.result, status: result_state.status, sub_process_id: this.id },
            Process.calculateNextStep(result_state.bag.parent_process_data.expected_step_number)
          );
        }
      }

      return [result_state, am, timer];
    } else {
      throw new Error(`Process [${this.id}] on invalid step`);
    }
  }

  IsJsonString(str) {
    try {
      let json;
      if (str) {
        json = JSON.parse(JSON.stringify(str));
        return typeof json === "object";
      } else {
        return true;
      }
    } catch (e) {
      emitter.emit("NODE.RESULT_ERROR", `ERROR AT JSON PARSE NODE`, {
        error: e,
      });
      return false;
    }
  }

  async _intermediaryLoop(custom_lisp, actor_data, trx) {
    emitter.emit(
      "EXECUTION_LOOP.TRANSACTION",
      `    BEGIN TRANSACTION FOR PID [${this.id}] - ENGINE_ID [${ENGINE_ID}]`,
      {
        process_id: this.id,
        engine_id: ENGINE_ID,
      }
    );

    const inner_loop_result = await this.__inerLoop.call(
      this,
      this._current_state_id,
      { custom_lisp, actor_data },
      trx
    );

    emitter.emit(
      "EXECUTION_LOOP.COMMIT",
      `      COMMIT ON EXEC PID [${this.id}] ON INNER LOOP - ENGINE_ID [${ENGINE_ID}]`,
      {
        process_id: this.id,
        engine_id: ENGINE_ID,
      }
    );

    return inner_loop_result;
  }

  // eslint-disable-next-line no-unused-vars
  async _executionLoop(custom_lisp, actor_data, input_trx = false) {
    emitter.emit("EXECUTION_LOOP.START", `CALLED EXECUTION LOOP PID [${this.id}] STATUS [${this.status}]`, {
      process_id: this.id,
      engine_id: ENGINE_ID,
      status: this.status,
    });

    let execution_success = true;
    let [activity_manager, timer] = [null, null];
    while (execution_success && this.status === ProcessStatus.RUNNING) {
      const db = Process.getPersist()._db;

      let ps = null;
      try {
        if(input_trx) {
          [ps, activity_manager, timer] = await this._intermediaryLoop(custom_lisp, actor_data, input_trx);
        } else {
          await db.transaction(async (trx) => {
            [ps, activity_manager, timer] = await this._intermediaryLoop(custom_lisp, actor_data, trx);
          });
        }

        ps && emitter.emit("PROCESS.STEP_CREATED", "", {});
      } catch (e) {
        
        console.log("Error: ", e);

        execution_success = false;
        emitter.emit(
          "EXECUTION_LOOP.ROLLBACK",
          `      ROLLBACK ON EXEC PID [${this.id}]  ON INNER LOOP - ENGINE_ID [${ENGINE_ID}]`,
          {
            process_id: this.id,
            engine_id: ENGINE_ID,
            error: e,
          }
        );
      }

      emitter.emit(
        "EXECUTION_LOOP.END",
        `  END LOOP PID [${this.id}] STATUS [${this.status}] EXECUTION SUCCESS [${execution_success}]`,
        {
          process_id: this.id,
          engine_id: ENGINE_ID,
          status: this.status,
        }
      );

      //this condition is necessary for am type = notify, whose processStatus is RUNNING, therefore the am will be overwritten by the next am and it would not be notified by the emitter outside the loop.
      if (this.status === ProcessStatus.RUNNING && activity_manager) {
        emitter.emit("PROCESS.ACTIVITY_MANAGER.CREATED", `ACTIVITY MANAGER NOTIFY CREATED ON PID [${this.id}]`, {
          process: this,
          activity_manager,
          timer,
        });
        await this._notifyActivityManager(activity_manager);
      }
    }

    if (activity_manager) {
      emitter.emit("PROCESS.ACTIVITY_MANAGER.CREATED", `ACTIVITY MANAGER CREATED ON PID [${this.id}]`, {
        process: this,
        activity_manager,
        timer,
      });
      await this._notifyActivityManager(activity_manager);
    }

    switch (this.status) {
      case ProcessStatus.ERROR:
      case ProcessStatus.INTERRUPTED:
        await ActivityManager.interruptActivityManagerForProcess(this._id);
        break;
      case ProcessStatus.FINISHED:
        await ActivityManager.finishActivityManagerForProcess(this._id, input_trx);  
        break;
      case ProcessStatus.FORBIDDEN:
        await ActivityManager.finishActivityManagerForProcess(this._id);
        break;
    }

    emitter.emit("EXECUTION_LOOP.LEFT", `LEFT EXECUTION LOOP PID [${this.id}] STATUS [${this.status}]`, {
      process_id: this.id,
      engine_id: ENGINE_ID,
      status: this.status,
    });
  }

  // eslint-disable-next-line no-unused-vars
  async timeout(timer, trx = false) {
    emitter.emit("PROCESS.TIMEOUT", `TIMEOUT ON PID [${this.id}] TIMER [${timer.id}]`, {
      process_id: this.id,
      timer_id: timer.id,
    });

    this.state = await this.getPersist().getLastStateByProcess(this._id);
    switch (this.status) {
      case ProcessStatus.ERROR:
      case ProcessStatus.FINISHED:
      case ProcessStatus.EXPIRED:
        break;
      case ProcessStatus.PENDING:
        await this.runPendingProcess(timer.params.actor_data, trx);
        break;
      case ProcessStatus.RUNNING:
        //TODO: Avaliar como expirar um processo running.
        emitter.emit("PROCESS.TIMEOUT.BAIL", `  CANNOT EXPIRE RUNNING PROCESS PID [${this.id}]`, {
          process_id: this.id,
          timer_id: timer.id,
        });
        break;
      case ProcessStatus.WAITING:
      case ProcessStatus.DELEGATED:
        await this.expireProcess();
        break;
    }
  }

  async _notifyProcessState(actor_data) {
    const process_state_notifier = getProcessStateNotifier();
    if (process_state_notifier) {
      await process_state_notifier(
        {
          ...this.state.serialize(),
          workflow_name: this.workflow_name,
        },
        actor_data
      );
    }
  }

  async _notifyActivityManager(activity_manager) {
    const activity_manager_notifier = getActivityManagerNotifier();
    if (activity_manager_notifier) {
      await activity_manager_notifier({
        ...activity_manager,
        _process_id: this.id,
      });
    }
  }

  async _fetchActivityManagerFromProcessId(process_id, actor_data, status) {
    return await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, status);
  }

  async _createActivityManager(activity_manager, next_step_number, trx = false, activity_schema) {
    activity_manager.parameters.next_step_number = next_step_number;
    activity_manager.parameters.activity_schema = activity_schema;
    activity_manager.process_state_id = this._state.id;
    const am = await activity_manager.save(trx);
    return am;
  }

  async _createStateFromNodeResult(
    { node_id, bag, external_input, result, error, status, next_node_id, time_elapsed },
    actor_data,
    result_schema = ""
  ) {
    const step_number = await this.getNextStepNumber();

    if (error) {
      this._errorState(error);
      status = ProcessStatus.ERROR;
    }

    if (result_schema) {
      const resultSchemaError = validateResult(result_schema, result.data);
      if (resultSchemaError) {
        emitter.emit("PROCESS.RESULT_SCHEMA.ERROR", resultSchemaError, {
          process_id: this.id,
          message: resultSchemaError.message,
        });
        status = ProcessStatus.ERROR;
        error = resultSchemaError.message;
      }
    }

    return new ProcessState(
      this._id,
      step_number,
      node_id,
      bag,
      external_input,
      { ...result, step_number },
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
        result_schema: node._spec.result_schema,
        process_id: this.id,
        parameters: {
          ...this._blueprint_spec.parameters,
          process_id: this._id,
        },
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

  _forbiddenState(error = null) {
    const forbidden_status = ProcessStatus.FORBIDDEN;
    const state = { status: forbidden_status, state: { ...this._state, error } };
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
