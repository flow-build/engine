const delegate = require("delegates");
const bpu = require("../core/utils/blueprint");
const { Workflow } = require("../core/workflow/workflow");
const { Process } = require("../core/workflow/process");
const { Packages } = require("../core/workflow/packages");
const { Engine } = require("../engine/engine");
const { ProcessState } = require("../core/workflow/process_state");
const { ActivityManager } = require("../core/workflow/activity_manager");
const { Timer } = require("../core/workflow/timer");
const { prepare } = require("../core/utils/input");
const { getAllParameters, getParameters, getParameter,
  putParameter, deleteParameter } = require("./utils/parametersClient");

class Cockpit {
  static get instance() {
    return Cockpit._instance;
  }

  static set instance(instance) {
    Cockpit._instance = instance;
  }

  constructor(persist_mode, persist_args, logger_level) {
    if (Cockpit.instance) {
      return Cockpit.instance;
    }

    this._engine = new Engine(persist_mode, persist_args, logger_level);
    delegate(this, "_engine")
      .method("fetchAvailableActivitiesForActor")
      .method("fetchDoneActivitiesForActor")
      .method("fetchAvailableActivityForProcess")
      .method("beginActivity")
      .method("commitActivity")
      .method("pushActivity")
      .method("createProcess")
      .method("createProcessByWorkflowName")
      .method("runProcess")
      .method("fetchProcess")
      .method("fetchProcessList")
      .method("fetchProcessStateHistory")
      .method("abortProcess")
      .method("saveWorkflow")
      .method("fetchWorkflow")
      .method("deleteWorkflow")
      .method("savePackage")
      .method("fetchPackage")
      .method("deletePackage")
      .method("addCustomSystemCategory");

    Cockpit.instance = this;
  }

  async fetchWorkflowsWithProcessStatusCount(filters) {
    const workflows_data = await Process.getPersist().getWorkflowWithProcesses(filters);
    return workflows_data.reduce((accum, workflow) => {
      const workflow_id = workflow.id;
      if (!accum[workflow_id]) {
        accum[workflow_id] = {
          workflow_name: workflow.name,
          workflow_description: workflow.description,
          workflow_version: workflow.version,
        };
      }

      if (workflow.state) {
        const process_status = workflow.state.status;
        if (accum[workflow_id][process_status]) {
          accum[workflow_id][process_status] += 1;
        } else {
          accum[workflow_id][process_status] = 1;
        }
      }
      return accum;
    }, {});
  }

  async getProcessStateHistory(process_id) {
    return await Process.getPersist().getStateHistoryByProcess(process_id);
  }

  async getProcessStateExecutionHistory(process_id, filters = {}) {
    const states = await Process.getPersist().getStateHistoryByProcess(process_id, filters);
    return states.reduce((acc, state, idx) => {
      if (idx === 0) {
        acc.current_status = state.status
        acc.max_step_number = state.step_number
      }
      const { node_id, status, step_number, created_at, result } = state
      const foundState = acc.execution.find((exec) => exec.node_id === node_id)
      if (foundState) {
        foundState.step_numbers.push(step_number)
        return acc
      }

      acc.execution.push({
        node_id: node_id,
        last_created_at: created_at,
        last_status: status,
        step_numbers: [step_number],
        process_id: result?.process_id || result?.sub_process_id,
      })
      return acc
    }, {
      current_status: '',
      max_step_number: 0,
      execution: []
    });
  }

  async getWorkflows() {
    return await Workflow.getPersist().getAll();
  }

  async getWorkflowsForActor(actor_data) {
    const workflows_data = await Workflow.getPersist().getAll();
    return await this._filterForAllowedWorkflows(workflows_data, actor_data);
  }

  async runPendingProcess(process_id, actor_data) {
    const process = await Process.fetch(process_id);
    if (!process) {
      throw new Error("Process not found");
    }
    const result = await process.runPendingProcess(actor_data);
    return result;
  }

  async setProcessState(process_id, state_data) {
    let process = await Process.fetch(process_id);
    if (!process) {
      throw new Error("Process not found");
    }

    process = await process.setState(state_data);
    return process.state;
  }

  async getProcessState(stateId) {
    if (!stateId) {
      throw new Error("[getProcessState] Process Id not provided");
    }

    return await ProcessState.fetch(stateId);
  }

  async findProcessStatesByStepNumber(processId, stepNumber) {
    if (!processId) {
      throw new Error("[findProcessStatesByStepNumber] Process Id not provided");
    }

    if (!stepNumber) {
      throw new Error("[findProcessStatesByStepNumber] stepNumber not provided");
    }

    const result = await ProcessState.fetchByStepNumber(processId, stepNumber);
    return result;
  }

  async findProcessStatesByNodeId(processId, nodeId) {
    if (!processId) {
      throw new Error("[findProcessStatesByNodeId] Process Id not provided");
    }

    if (!nodeId) {
      throw new Error("[findProcessStatesByNodeId] NodeId not provided");
    }

    const result = await ProcessState.fetchByNodeId(processId, nodeId);
    return result;
  }

  async fetchPreviousState(processId, state) {
    const step_number = state.step_number;
    if (step_number > 1) {
      return await ProcessState.fetchByStepNumber(processId, step_number - 1);
    } else {
      return {
        bag: {},
        result: {},
        actor_data: {},
        environment: {}
      }
    }
  }

  async mountExecutionData({
    nodeSpec,
    previousState,
    currentState
  }) {
    const executionData = prepare(nodeSpec.parameters?.input || {}, {
      bag: previousState._bag,
      result: previousState._result,
      actor_data: previousState._actor_data,
      environment: previousState.environment,
    })
    return {
      stepNumber: currentState.step_number,
      nodeSpec: nodeSpec,
      executionData: executionData,
      previousState: previousState._id
        ? ProcessState.serialize(previousState)
        : {},
      currentState: ProcessState.serialize(currentState)
    }
  }

  async fetchStateExecutionContext(stateId) {
    if (!stateId) {
      throw new Error("[fetchStateExecutionContext] stateId not provided");
    }

    const currentState = await ProcessState.fetch(stateId);
    if (currentState) {
      const processId = currentState.process_id;

      const previousState = await this.fetchPreviousState(processId, currentState)

      const process = await Process.fetch(processId);
      const nodes = process?._blueprint_spec?.nodes || []
      const nodeSpec = nodes.find((node) => node.id === currentState._node_id);

      return this.mountExecutionData({ nodeSpec, previousState, currentState })
    }
    throw new Error("[fetchStateExecutionContext] state not found");
  }

  async _filterForAllowedWorkflows(workflows_data, actor_data) {
    const allowed_workflows = [];
    for (let workflow_data of workflows_data) {
      const blueprint_spec = workflow_data.blueprint_spec;
      const custom_lisp = await Packages._fetchPackages(blueprint_spec.requirements, blueprint_spec.prepare);
      const allowed_start_nodes = bpu.getAllowedStartNodes(blueprint_spec, actor_data, {}, custom_lisp);
      if (allowed_start_nodes.length === 1) {
        allowed_workflows.push(workflow_data);
      }
    }
    return allowed_workflows;
  }

  async fetchTimersReady() {
    return await Timer.fetchAllReady();
  }

  async fetchTimersActive() {
    return await Timer.fetchAllActive();
  }

  async expireProcess(process_id, actor_data, result = {}) {
    const process = await Process.fetch(process_id);
    const timer = new Timer("Process", process.id);
    await timer.retrieve();

    if (timer._id) {
      emitter.emit("ENGINE.EXPIRE_PROCESS.TIMER", { active: false, resource_type: process_id });
      await timer.deactivate();
    }

    emitter.emit("ENGINE.CONTINUE_PROCESS.WORKS", { process_id });
    await process.expireProcess(false, { actor_data, result });
    return undefined;
  }

  async expireActivityManager(amid, actor_data) {
    let am = await ActivityManager.fetch(amid);
    if (!am) {
      return {
        error: {
          errorType: "activityManager",
          message: "activity manager not found",
        },
      };
    }
    await ActivityManager.expire(amid, am, { actor_data });
    //check whether the activity manager is started
    if (am.activity_status !== "started") {
      return {
        error: {
          errorType: "activityManager",
          message: "activity manager unavailable",
        },
      };
    }
    return am;
  }

  async saveParameter(name, value) {
    let type;
    if (typeof value === "string" && value.split(",").length > 1) {
      type = "StringList";
    } else {
      type = "String";
    }

    return await putParameter(name, value, type);
  }

  async fetchParameters(keys) {
    return await getParameters(keys);
  }

  async fetchAllParameters(keys) {
    return await getAllParameters(keys);
  }

  async fetchParameter(key) {
    return await getParameter(key);
  }

  async deleteParameter(key) {
    return await deleteParameter(key);
  }
}

module.exports = {
  Cockpit: Cockpit,
};
