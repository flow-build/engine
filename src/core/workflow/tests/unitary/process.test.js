const { v1: uuid } = require("uuid");
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");
const { Engine } = require("../../../../engine/engine");
const { blueprints_, actors_ } = require("../../tests/unitary/blueprint_samples");
const { Process } = require("../../process");
const { ProcessStatus } = require("../../process_state");

let actualTimeout = setTimeout;

function wait() {
  return new Promise((resolve) => {
    actualTimeout(resolve, 300);
  });
}

describe("Process test", () => {
  async function cleanData() {
    const persistor = PersistorProvider.getPersistor(...settings.persist_options);
    const activity_persist = persistor.getPersistInstance("Activity");
    const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
    const process_persist = persistor.getPersistInstance("Process");
    const workflow_persist = persistor.getPersistInstance("Workflow");
    const timer_persist = persistor.getPersistInstance("Timer");

    await activity_persist.deleteAll();
    await activity_manager_persist.deleteAll();
    await process_persist.deleteAll();
    await workflow_persist.deleteAll();
    await timer_persist.deleteAll();
  }

  beforeEach(async () => {
    await cleanData();
  });

  afterAll(async () => {
    await cleanData();
    if (settings.persist_options[0] === "knex") {
      await settings.persist_options[1].destroy();
    }
    Engine.kill();
  });

  describe("getNextStepNumber", () => {
    test("Add 1 to last step_number saved", async () => {
      const persistor = PersistorProvider.getPersistor(...settings.persist_options);
      const process_persist = persistor.getPersistInstance("Process");

      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      const process_id = uuid();
      let example_process = {
        id: process_id,
        workflow_id: workflow.id,
        blueprint_spec: blueprints_.minimal,
        created_at: new Date(),
        state: {
          id: uuid(),
          process_id: process_id,
          step_number: 9,
          node_id: "1",
          next_node_id: "2",
          bag: {},
          external_input: null,
          result: null,
          error: null,
          status: ProcessStatus.RUNNING,
          created_at: new Date(),
        },
      };
      await process_persist.save(example_process);
      const process = await Process.fetch(process_id);

      const next_step = await process.getNextStepNumber();
      expect(next_step).toEqual(10);
    });
  });

  describe("abort", () => {
    test("process won't continue if abort called during timeout", async () => {
      try {
        //let actualTimeout = setTimeout;
        jest.useFakeTimers();

        const engine = new Engine(...settings.persist_options);
        const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.timer);
        let process = await engine.createProcess(workflow.id, actors_.simpleton);
        const process_id = process.id;
        engine.runProcess(process_id, actors_.simpleton).catch(() => {});
        await wait();
        process = await engine.fetchProcess(process_id);
        expect(process.status).toEqual(ProcessStatus.PENDING);

        await engine.abortProcess(process_id, actors_.simpleton);

        process = await engine.fetchProcess(process_id);
        expect(process.status).toEqual(ProcessStatus.INTERRUPTED);

        jest.runAllTimers();
        await wait();

        process = await engine.fetchProcess(process_id);
        expect(process.status).toEqual(ProcessStatus.INTERRUPTED);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("setState", () => {
    test("set passed values of bag, result, next_node_id and step_number", async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      let process = await engine.createProcess(workflow.id, actors_.simpleton);
      const process_id = process.id;

      process = await engine.fetchProcess(process_id);
      const result = await process.setState({
        bag: { bagKey: "bag value" },
        result: { resultKey: "result value" },
        next_node_id: "99",
      });

      expect(result.state).toBeDefined();
      expect(result.state.status).toEqual(ProcessStatus.PENDING);
      expect(result.state.bag).toEqual({ bagKey: "bag value" });
      expect(result.state.result).toEqual({ resultKey: "result value" });
      expect(result.state.next_node_id).toEqual("99");
      expect(result.state.process_id).toEqual(process_id);
      expect(result.state.step_number).toEqual(2);
      expect(result.state.node_id).toEqual("minimal_1");
    });

    test("notify setted state", async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      let process = await engine.createProcess(workflow.id, actors_.simpleton);
      const process_id = process.id;

      try {
        const process_state_notifier = jest.fn();
        engine.setProcessStateNotifier(process_state_notifier);

        process = await engine.fetchProcess(process_id);
        const result = await process.setState({
          bag: { bagKey: "bag value" },
          result: { resultKey: "result value" },
          next_node_id: "99",
        });

        expect(result.state).toBeDefined();
        expect(result.state.status).toEqual(ProcessStatus.PENDING);

        expect(process_state_notifier).toHaveBeenCalledTimes(1);
        const notify_call_args = process_state_notifier.mock.calls[0];
        const notified_process_state = notify_call_args[0];
        expect(notified_process_state).toBeDefined();

        expect(notified_process_state.status).toEqual(ProcessStatus.PENDING);
        expect(notified_process_state.bag).toEqual({ bagKey: "bag value" });
        expect(notified_process_state.result).toEqual({ resultKey: "result value" });
        expect(notified_process_state.next_node_id).toEqual("99");
        expect(notified_process_state.process_id).toEqual(process_id);
        expect(notified_process_state.step_number).toEqual(2);
        expect(notified_process_state.node_id).toEqual("minimal_1");
        expect(notified_process_state.workflow_name).toEqual("sample");
      } finally {
        engine.setProcessStateNotifier();
      }
    });

    test("error if process finished", async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      let process = await engine.createProcess(workflow.id, actors_.simpleton);
      const process_id = process.id;
      await engine.runProcess(process_id, actors_.simpleton);

      process = await engine.fetchProcess(process_id);
      const result = process.setState({});

      await expect(result).rejects.toThrowError("invalid status");
    });

    test("error process finished", async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      let process = await engine.createProcess(workflow.id, actors_.simpleton);
      const process_id = process.id;
      await engine.abortProcess(process_id);

      process = await engine.fetchProcess(process_id);
      const result = process.setState({});

      await expect(result).rejects.toThrowError("invalid status");
    });

    test("it should contain the $process_id and $step_number on node execution", async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.ref);
      const process = await engine.createProcess(workflow.id, actors_.simpleton);

      await engine.runProcess(process.id, actors_.simpleton);

      const history = await engine.fetchProcessStateHistory(process.id);

      expect(history.length).toEqual(4);
      expect(history[0]._bag).toEqual({ process_id: process.id, step_number: 2 });
    });
  });

  describe("__inerLoop", () => {
    test("run condition", async () => {
      process.env.engine_id = uuid();
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
      const process_id = workflow_process.id;

      const persistor = PersistorProvider.getPersistor(...settings.persist_options);
      const process_persist = persistor.getPersistInstance("Process");
      await process_persist._db.transaction(async (trx) => {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data: actors_.simpleton }, trx);
      });

      const alternate_workflow_process = await engine.fetchProcess(process_id);
      await alternate_workflow_process.continue({}, actors_.simpleton);

      const transaction = process_persist._db.transaction(async (trx) => {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data: actors_.simpleton }, trx);
      });
      await expect(transaction).rejects.toThrowError();

      const process_history = await engine.fetchProcessStateHistory(process_id);
      expect(process_history).toHaveLength(3);
    });
  });

  describe("IsJsonString", () => {
    let workflow_process;
    beforeEach(async () => {
      const engine = new Engine(...settings.persist_options);
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
      workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
    });

    test("it should pass with correct JSON input", async () => {
      const test_input = {
        prop: "foo",
      };
      expect(workflow_process.IsJsonString(test_input)).toEqual(true);
    });

    test("it should fail with text input", async () => {
      const test_input = "wrong input";
      expect(workflow_process.IsJsonString(test_input)).toEqual(false);
    });

    test("it should fail with numeric input", async () => {
      const test_input = 123456789;
      expect(workflow_process.IsJsonString(test_input)).toEqual(false);
    });

    test("it should fail with boolean input", async () => {
      const test_input = true;
      expect(workflow_process.IsJsonString(test_input)).toEqual(false);
    });

    test("it should pass with undefined input", async () => {
      const test_input = undefined;
      expect(workflow_process.IsJsonString(test_input)).toEqual(true);
    });
  });

  describe("fetchAll", () => {
    let workflows = [];
    let processes = [];
    beforeEach(async () => {
      workflows = [];
      processes = [];
      const engine = new Engine(...settings.persist_options, "error");
      const workflow1 = await engine.saveWorkflow("sample1", "sample", blueprints_.minimal);
      workflows.push(workflow1);
      const workflow2 = await engine.saveWorkflow("sample2", "sample", blueprints_.minimal);
      workflows.push(workflow2);
      const p1 = await engine.createProcessByWorkflowName("sample1", actors_.simpleton);
      processes.push(p1);
      const p2 = await engine.createProcessByWorkflowName("sample2", actors_.simpleton);
      processes.push(p2);
      const p3 = await engine.createProcessByWorkflowName("sample1", actors_.simpleton);
      processes.push(p3);
      await engine.runProcess(p3._id, actors_.simpleton);
    });

    test("it should return all processes if called without params", async () => {
      const fetchProcesses = await Process.fetchAll();
      expect(fetchProcesses).toHaveLength(processes.length);
    });

    test("workflow_id filter as existing id should works", async () => {
      const fetchProcesses = await Process.fetchAll({ workflow_id: workflows[0]._id });
      expect(fetchProcesses).toHaveLength(2);
    });

    test("workflow_id filter as invalid uuid id should fail", async () => {
      const fetchProcesses = await Process.fetchAll({ workflow_id: "not_a_uuid" });
      expect(fetchProcesses.error).toBeDefined();
    });

    test("workflow_id filter as random uuid id should return empty", async () => {
      const fetchProcesses = await Process.fetchAll({ workflow_id: uuid() });
      expect(fetchProcesses).toHaveLength(0);
    });

    test("workflow_name filter as valid name id should return all versions", async () => {
      const fetchProcesses = await Process.fetchAll({ workflow_name: "sample2" });
      expect(fetchProcesses).toHaveLength(1);
    });

    test("workflow_name filter as random name id should return empty", async () => {
      const fetchProcesses = await Process.fetchAll({ workflow_name: "sample3" });
      expect(fetchProcesses).toHaveLength(0);
    });

    test("process_id filter as uuid should work", async () => {
      const fetchProcesses = await Process.fetchAll({ process_id: processes[0]._id });
      expect(fetchProcesses).toHaveLength(1);
    });

    test("process_id filter as array should work", async () => {
      const processList = processes.map((process) => process._id);
      processList.pop();
      const fetchProcesses = await Process.fetchAll({ process_id: processList });
      expect(fetchProcesses).toHaveLength(2);
    });

    test("current_status filter should work", async () => {
      const fetchProcesses = await Process.fetchAll({ current_status: "finished" });
      expect(fetchProcesses).toHaveLength(1);
    });

    test("current_status array filter should work", async () => {
      const fetchProcesses = await Process.fetchAll({ current_status: ["unstarted", "finished"] });
      expect(fetchProcesses).toHaveLength(3);
    });

    test("limit filter should work", async () => {
      const fetchProcesses = await Process.fetchAll({ limit: 1 });
      expect(fetchProcesses).toHaveLength(1);
      expect(fetchProcesses[0].id).toEqual(processes[2]._id);
    });

    test("offset filter should work", async () => {
      const fetchProcesses = await Process.fetchAll({ limit: 1, offset: 1 });
      expect(fetchProcesses).toHaveLength(1);
      expect(fetchProcesses[0].id).toEqual(processes[1]._id);
    });

    test("multiples filters (string) should work", async () => {
      const fetchProcesses = await Process.fetchAll({ current_status: "unstarted", workflow_name: "sample1" });
      expect(fetchProcesses).toHaveLength(1);
    });

    test("multiples filters (string, array) should work", async () => {
      const processList = processes.map((process) => process._id);
      const fetchProcesses = await Process.fetchAll({ current_status: "unstarted", process_id: processList });
      expect(fetchProcesses).toHaveLength(2);
    });
  });

  describe("service deprecated", () => {
    test("it should fail with forbidden status", async () => {
      const persistor = PersistorProvider.getPersistor(...settings.persist_options);
      const db = persistor.getPersistInstance("Workflow")._db;
      const engine = new Engine(...settings.persist_options);
      const processId = "cd4fe660-a931-11ec-8b85-85353dffff77";
      const process_payload = {
        id: processId,
        created_at: "2022-03-21T16:13:10.470Z",
        workflow_id: "9a5cd6f0-a931-11ec-b97a-c373d67a14f1",
        blueprint_spec: blueprints_.custom_node,
        current_state_id: "cd511ee0-a931-11ec-8b85-85353dffff77",
        current_status: "unstarted",
      };

      const state_payload = {
        id: "cd511ee0-a931-11ec-8b85-85353dffff77",
        created_at: "2022-03-21T16:13:10.478Z",
        process_id: processId,
        step_number: 1,
        node_id: "1",
        bag: {},
        external_input: {},
        result: {},
        error: null,
        status: "unstarted",
        next_node_id: "1",
        actor_data: {
          actor_id: "4",
          claims: ["simpleton"],
        },
        engine_id: "cd07b9d0-a931-11ec-8b85-85353dffff77",
        time_elapsed: null,
      };

      const workflow = {
        id: "9a5cd6f0-a931-11ec-b97a-c373d67a14f1",
        created_at: "2022-03-21T16:11:44.963Z",
        name: "custom_node_wf",
        description: "custom_node_wf",
        blueprint_spec: blueprints_.custom_node,
        blueprint_hash: "23bcd8701abcb55a7fcdead1a95958de102a9b3cd65724019b3c987c9ebea6f0",
        version: 1,
      };

      await db("workflow").insert(workflow);
      await db("process").insert(process_payload);
      await db("process_state").insert(state_payload);

      let process = await engine.fetchProcess(process_payload.id);
      expect(process.status).toEqual(ProcessStatus.UNSTARTED);

      await engine.runProcess(processId);
      process = await engine.fetchProcess(processId);
      expect(process.status).toEqual(ProcessStatus.FORBIDDEN);

      expect(process._state._error).toEqual("Error: Invalid service task, unknow category custom_fn");
    });
  });
});
