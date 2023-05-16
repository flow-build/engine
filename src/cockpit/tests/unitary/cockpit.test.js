const _ = require("lodash");
const { v1: uuid } = require("uuid");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const { Cockpit } = require("../../cockpit");
const { Engine } = require("../../../engine/engine");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");
const extra_nodes = require("../../../engine/tests/utils/extra_nodes");
const utils = require("./cockpitUtils");

const cockpit = new Cockpit(...utils.persistOptions);
const engine = new Engine(...utils.persistOptions);

beforeEach(async () => {
  await utils._clean();
});

afterAll(async () => {
  Engine.kill();
  await utils._clean();
});

describe("fetchWorkflowsWithProcessStatusCount", () => {
  test("base test", async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    const myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    await cockpit.runProcess(myProcess.id, actors_.simpleton, {});

    let response = await cockpit.fetchWorkflowsWithProcessStatusCount();
    expect(response[myWorkflow.id].workflow_name).toEqual("sample");
    expect(response[myWorkflow.id].workflow_description).toEqual("sample");
    expect(response[myWorkflow.id].workflow_version).toEqual(1);
    expect(response[myWorkflow.id].unstarted).toEqual(1);
    expect(response[myWorkflow.id].finished).toEqual(1);
  });

  test("workflow_id filter works", async () => {
    const workflow1 = await cockpit.saveWorkflow("sample1", "sample1", blueprints_.minimal);
    await cockpit.createProcess(workflow1.id, actors_.simpleton);
    const workflow2 = await cockpit.saveWorkflow("sample2", "sample2", blueprints_.minimal);
    await cockpit.createProcess(workflow2.id, actors_.simpleton);

    let response = await cockpit.fetchWorkflowsWithProcessStatusCount({ workflow_id: workflow2.id });
    expect(response[workflow1.id]).toBeUndefined();
    expect(response[workflow2.id]).toBeDefined();
  });

  test("start_date filter works", async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    await cockpit.createProcess(myWorkflow.id, actors_.simpleton);

    // Force time difference
    await utils.sleep();
    const start_date = new Date();
    await utils.sleep();

    const myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    await cockpit.runProcess(myProcess.id, actors_.simpleton, {});

    let response = await cockpit.fetchWorkflowsWithProcessStatusCount({ start_date });
    expect(response[myWorkflow.id]).toBeDefined();
    expect(response[myWorkflow.id].unstarted).toBeUndefined();
    expect(response[myWorkflow.id].finished).toEqual(1);

    response = await cockpit.fetchWorkflowsWithProcessStatusCount({ start_date: start_date.toJSON() });
    expect(response[myWorkflow.id]).toBeDefined();
    expect(response[myWorkflow.id].unstarted).toBeUndefined();
    expect(response[myWorkflow.id].finished).toEqual(1);
  });

  test("end_date filter works", async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    await cockpit.createProcess(myWorkflow.id, actors_.simpleton);

    // Force time difference
    await utils.sleep();
    const end_date = new Date();
    await utils.sleep();

    const myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    await cockpit.runProcess(myProcess.id, actors_.simpleton, {});

    let response = await cockpit.fetchWorkflowsWithProcessStatusCount({ end_date: end_date });
    expect(response[myWorkflow.id]).toBeDefined();
    expect(response[myWorkflow.id].unstarted).toEqual(1);
    expect(response[myWorkflow.id].finished).toBeUndefined();

    response = await cockpit.fetchWorkflowsWithProcessStatusCount({ end_date: end_date.toJSON() });
    expect(response[myWorkflow.id]).toBeDefined();
    expect(response[myWorkflow.id].unstarted).toEqual(1);
    expect(response[myWorkflow.id].finished).toBeUndefined;
  });

  test("workflow without process", async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample description", blueprints_.minimal);

    let response = await cockpit.fetchWorkflowsWithProcessStatusCount();
    expect(response[myWorkflow.id]).toEqual({
      workflow_name: "sample",
      workflow_description: "sample description",
      workflow_version: 1,
    });
  });
});

describe("getProcessStateHistory works", () => {
  test("getProcessStateHistory when there are states for the process", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.simpleton);
    myProcess = await engine.runProcess(myProcess.id, actors_.simpleton);
    const myHistory = await engine.fetchProcessStateHistory(myProcess.id);
    const myHistoryData = await cockpit.getProcessStateHistory(myProcess.id);
    expect(myHistoryData).toHaveLength(myHistory.length);
    for (const state of myHistory) {
      const data = _.find(myHistoryData, { id: state.id });
      utils._validate_process_state_data(data, state);
    }
  });

  test("getProcessStateHistory works for no states", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.admin);
    await engine.runProcess(myProcess.id, actors_.admin);
    const myHistoryData = await cockpit.getProcessStateHistory(uuid());
    expect(myHistoryData).toHaveLength(0);
  });

  test("getProcessStateHistory works when there are many processes with states", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let simpleton_process = await engine.createProcess(myWorkflow.id, actors_.simpleton);
    simpleton_process = await engine.runProcess(simpleton_process.id, actors_.simpleton);
    let admin_process = await engine.createProcess(myWorkflow.id, actors_.admin);
    admin_process = await engine.runProcess(admin_process.id, actors_.admin);
    const simpleton_process_state_history = await engine.fetchProcessStateHistory(simpleton_process.id);
    const admin_process_state_history = await engine.fetchProcessStateHistory(admin_process.id);
    const simpleton_process_state_data_history = await cockpit.getProcessStateHistory(simpleton_process.id);
    const admin_process_state_data_history = await cockpit.getProcessStateHistory(admin_process.id);
    expect(simpleton_process_state_data_history).toHaveLength(simpleton_process_state_history.length);
    expect(admin_process_state_data_history).toHaveLength(admin_process_state_history.length);
    for (const process_state of simpleton_process_state_history) {
      const process_state_data = _.find(simpleton_process_state_data_history, { id: process_state.id });
      utils._validate_process_state_data(process_state_data, process_state);
    }
    for (const process_state of admin_process_state_history) {
      const process_state_data = _.find(admin_process_state_data_history, { id: process_state.id });
      utils._validate_process_state_data(process_state_data, process_state);
    }
  });
});

describe("getProcessStateExecutionHistory works", () => {
  test("getProcessStateExecutionHistory when there are states for the process", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.simpleton);
    myProcess = await engine.runProcess(myProcess.id, actors_.simpleton);
    const myHistoryData = await cockpit.getProcessStateExecutionHistory(myProcess.id);

    expect(myHistoryData.current_status).toBe("finished")
    expect(myHistoryData.max_step_number).toBe(4)
    expect(myHistoryData.execution).toHaveLength(3)
  });

  test("getProcessStateExecutionHistory works for no states", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.admin);
    await engine.runProcess(myProcess.id, actors_.admin);
    const myHistoryData = await cockpit.getProcessStateExecutionHistory(uuid());
    expect(myHistoryData.current_status).toBe("")
    expect(myHistoryData.max_step_number).toBe(0)
    expect(myHistoryData.execution).toHaveLength(0)
  });

  test("getProcessStateExecutionHistory works with 'fromStep' filter", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.simpleton);
    myProcess = await engine.runProcess(myProcess.id, actors_.simpleton);
    const myHistoryData = await cockpit.getProcessStateExecutionHistory(myProcess.id, { fromStep: 3 });

    expect(myHistoryData.current_status).toBe("finished")
    expect(myHistoryData.max_step_number).toBe(4)
    expect(myHistoryData.execution).toHaveLength(2)
  });
});

describe("fetchStateExecutionContext works", () => {
  test("fetchStateExecutionContext when there are states for the process", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.simpleton);
    myProcess = await engine.runProcess(myProcess.id, actors_.simpleton);
    const myProcessHistory = await engine.fetchProcessStateHistory(myProcess.id);
    const lastState = myProcessHistory[1]
    const previousState = myProcessHistory[2]
    const myHistoryData = await cockpit.fetchStateExecutionContext(lastState._id);
    expect(myHistoryData.stepNumber).toBe(3)
    expect(myHistoryData.executionData).toStrictEqual({})
    expect(myHistoryData.currentState.id).toBe(lastState._id)
    expect(myHistoryData.previousState.id).toBe(previousState._id)
  });

  test("fetchStateExecutionContext should return error for no state", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let myProcess = await engine.createProcess(myWorkflow.id, actors_.admin);
    await engine.runProcess(myProcess.id, actors_.admin);
    await expect(cockpit.fetchStateExecutionContext(uuid())).rejects.toThrowError(
      "[fetchStateExecutionContext] state not found"
    );
  });
});

describe("getWorkflows", () => { });

describe("getWorkflowsForActor works", () => {
  test("getWorkflowsForActor when there are workflows available to actor", async () => {
    const myWorkflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    const actor_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(actor_workflows_data).toHaveLength(1);
    utils._validate_workflow_data(actor_workflows_data[0], myWorkflow);
  });

  test("getWorkflowsForActor when there are no workflows available", async () => {
    const actor_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(actor_workflows_data).toHaveLength(0);
  });

  test("getWorkflowsForActor when there are workflows, but not all are available to actor", async () => {
    const open_workflow = await engine.saveWorkflow("open", "open", blueprints_.identity_system_task);
    const restricted_workflow = await engine.saveWorkflow(
      "restricted",
      "restricted",
      blueprints_.restricted_multilane_identity_user_task
    );
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(simpleton_workflows_data).toHaveLength(1);
    utils._validate_workflow_data(simpleton_workflows_data[0], open_workflow);
    const admin_workflows_data = await cockpit.getWorkflowsForActor(actors_.admin);
    expect(admin_workflows_data).toHaveLength(2);
    const admin_open_workflow_data = _.find(admin_workflows_data, { name: "open" });
    const admin_restricted_workflow_data = _.find(admin_workflows_data, { name: "restricted" });
    utils._validate_workflow_data(admin_open_workflow_data, open_workflow);
    utils._validate_workflow_data(admin_restricted_workflow_data, restricted_workflow);
  });

  test("getWorkflowsForActor list workflows with multiple starts and only one start node is allowed", async () => {
    const open_workflow = await engine.saveWorkflow("multiple", "multiple", blueprints_.multiple_starts);
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(simpleton_workflows_data).toHaveLength(1);
    utils._validate_workflow_data(simpleton_workflows_data[0], open_workflow);
  });

  test("getWorkflowsForActor filters workflows with multiple starts and many start nodes are allowed", async () => {
    await engine.saveWorkflow("multiple", "multiple", blueprints_.multiple_starts);
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.admin);
    expect(simpleton_workflows_data).toHaveLength(0);
  });
});

describe("runPendingProcess", () => {
  test("works", async () => {
    const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    const process = await cockpit.createProcess(workflow.id, actors_.simpleton);
    await cockpit.setProcessState(process.id, {
      bag: process.state.bag,
      result: {},
      next_node_id: process.state.next_node_id,
    });

    await cockpit.runPendingProcess(process.id);

    const process_state_data_history = await cockpit.fetchProcessStateHistory(process.id);
    expect(process_state_data_history).toHaveLength(4);
  });

  test("pass actor_data to run process", async () => {
    const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.use_actor_data);
    let process = await cockpit.createProcess(workflow.id, actors_.simpleton);
    process = await cockpit.runProcess(process.id, actors_.simpleton);
    await cockpit.setProcessState(process.id, {
      bag: process.state.bag,
      result: {},
      next_node_id: "2",
    });

    await cockpit.runPendingProcess(process.id, actors_.admin);

    const process_state_data_history = await cockpit.fetchProcessStateHistory(process.id);
    expect(process_state_data_history).toHaveLength(7);
    const states_node_2 = process_state_data_history.filter((state) => state.node_id === "2");
    expect(states_node_2).toHaveLength(2);
    expect(states_node_2[0].step_number > states_node_2[1].step_number).toEqual(true);
    expect(states_node_2[0].bag).toEqual({ runUser: actors_.admin });
    expect(states_node_2[1].bag).toEqual({ runUser: actors_.simpleton });
  });

  test("exception with unknow process id", async () => {
    const process_id = uuid();
    await expect(cockpit.runPendingProcess(process_id)).rejects.toThrowError("Process not found");
  });

  test("exception with process unstarted", async () => {
    const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    const process = await cockpit.createProcess(workflow.id, actors_.simpleton);

    await expect(cockpit.runPendingProcess(process.id)).rejects.toThrowError("invalid status");
  });

  test("exception with invalid next node", async () => {
    const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    const process = await cockpit.createProcess(workflow.id, actors_.simpleton);
    await cockpit.setProcessState(process.id, {
      bag: process.state.bag,
      result: {},
      next_node_id: "invalid node",
    });

    await expect(cockpit.runPendingProcess(process.id)).rejects.toThrowError("Node not found");
  });
});

describe("setProcessState", () => {
  test("a valid processId must be provided", async () => {
    await expect(cockpit.setProcessState(uuid(), {})).rejects.toThrowError("Process not found");
  });
});

describe("Process State", () => {
  let myProcess;
  let myHistory;

  beforeEach(async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
    myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    await engine.runProcess(myProcess.id, actors_.simpleton);
    myHistory = await engine.fetchProcessStateHistory(myProcess.id);
  });

  describe("getProcessState", () => {
    test("getProcessState returns the state", async () => {
      const result = await cockpit.getProcessState(myHistory[0]._id);
      expect(result).toBeDefined();
      expect(result).toEqual(myHistory[0]);
    });

    test("getProcessState throw if no state is provided", async () => {
      await expect(cockpit.getProcessState()).rejects.toThrowError("Process Id not provided");
    });
  });

  describe("findProcessStatesByStepNumber", () => {
    test("findProcessStatesByStepNumber returns the state", async () => {
      const result = await cockpit.findProcessStatesByStepNumber(myProcess.id, 1);
      expect(result).toBeDefined();
      expect(result.id).toEqual(_.last(myHistory)._id);
    });

    test("findProcessStatesByStepNumber should throw if no process id is provided", async () => {
      await expect(cockpit.findProcessStatesByStepNumber()).rejects.toThrowError("Process Id not provided");
    });

    test("findProcessStatesByStepNumber should throw if no process id is provided", async () => {
      await expect(cockpit.findProcessStatesByStepNumber(myProcess.id, undefined)).rejects.toThrowError(
        "stepNumber not provided"
      );
    });
  });

  describe("findProcessStatesByNodeId", () => {
    test("findProcessStatesByNodeId returns the state", async () => {
      const result = await cockpit.findProcessStatesByNodeId(myProcess.id, "minimal_1");
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
    });

    test("findProcessStatesByNodeId should throw if no process id is provided", async () => {
      await expect(cockpit.findProcessStatesByNodeId(undefined, "minimal_1")).rejects.toThrowError(
        "Process Id not provided"
      );
    });

    test("findProcessStatesByNodeId should throw if no process id is provided", async () => {
      await expect(cockpit.findProcessStatesByNodeId(myProcess.id, undefined)).rejects.toThrowError(
        "NodeId not provided"
      );
    });
  });
});

describe("Timers", () => {
  let myTimers;
  beforeEach(async () => {
    myTimers = await utils.loadTimers();
  });

  test("fetchTimersReady", async () => {
    const result = await cockpit.fetchTimersReady();
    expect(result.length).toEqual(1);
    expect(result[0].id).toEqual(myTimers.ready.id);
  });

  test("fetchTimersActive", async () => {
    const result = await cockpit.fetchTimersActive();
    expect(result.length).toEqual(2);
  });
});

describe("Extra Nodes", () => {
  test("Validation of extra nodes works", async () => {
    cockpit.addCustomSystemCategory(extra_nodes);
    const customBp = _.cloneDeep(blueprints_.extra_nodes);
    const exampleNode = customBp.nodes.find((node) => node.category === "example");
    delete exampleNode.parameters.example;
    await expect(cockpit.saveWorkflow("sample", "sample", customBp)).rejects.toThrowError(
      "must have required property 'example'"
    );
  });

  test("Execution of extra nodes works", async () => {
    cockpit.addCustomSystemCategory(extra_nodes);
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.extra_nodes);
    let myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    myProcess = await cockpit.runProcess(myProcess.id, actors_.simpleton);
    expect(myProcess.status).toBe(ProcessStatus.FINISHED);
  });
});

describe("expireProcess", () => {
  let myProcess;
  beforeEach(async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton, { expire_this_process: true });
    await engine.runProcess(myProcess.id, actors_.simpleton);
    await utils.sleep(1000);
  });

  test("expireProcess should work even without timer", async () => {
    await cockpit.expireProcess(myProcess.id, actors_.admin, { foo: "bar" });
    const myHistory = await engine.fetchProcessStateHistory(myProcess.id);
    expect(myHistory[0].status).toEqual("expired");
    expect(myHistory[0].result.foo).toBeDefined();
    expect(myHistory[0].actor_data.actor_id).toEqual(actors_.admin.actor_id);
    expect(myHistory[0].bag).toEqual({ expire_this_process: true });
  });

  test("expireProcess should deactivate existing timer", async () => {
    const timerId = uuid();
    const now = new Date();
    await utils.saveTimer({
      id: timerId,
      created_at: new Date(),
      expires_at: new Date(now.setDate(now.getDate() + 5)),
      active: true,
      resource_type: "Process",
      resource_id: myProcess.id,
    });
    await cockpit.expireProcess(myProcess.id, actors_.admin, { foo: "bar" });
    const myTimer = await utils.getTimer(timerId);
    expect(myTimer.active).toBe(false);
  });
});

describe("expireActivityManager", () => {
  let myProcess;
  let myActivityManager;
  beforeEach(async () => {
    const myWorkflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    myProcess = await cockpit.createProcess(myWorkflow.id, actors_.simpleton);
    await engine.runProcess(myProcess.id, actors_.simpleton);
    await utils.sleep(1000);
    myActivityManager = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
  });

  test("expireActivityManager should work", async () => {
    await cockpit.expireActivityManager(myActivityManager[0].id, actors_.admin);
    const myHistory = await engine.fetchProcessStateHistory(myProcess.id);
    expect(myHistory[1].status).toEqual("running");
    expect(myHistory[1].result.is_continue).toBeTruthy();
  });
});
