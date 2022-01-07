const settings = require("../../../../settings/tests/settings");
const { Engine } = require("../../engine");
const { PersistorProvider } = require("../../../core/persist/provider");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const { Process } = require("../../../core/workflow/process");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");

let engine;

beforeAll(() => {
  engine = new Engine(...settings.persist_options);
  jest.setTimeout(60000);
});

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    await Process.getPersist()._db.destroy();
  }
  Engine.kill();
});

test("Workflow should not work with missing requirements", async () => {
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.missing_requirements);
  let process = await engine.createProcess(workflow.id, actors_.simpleton);
  process = await engine.runProcess(process.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.ERROR);
  expect(process.state.error).toMatch("Couldn't execute scripted function");
});

test("Engine create process", async () => {
  //const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const process = await engine.createProcess(workflow.id, actors_.simpleton);
  expect(process.id).toBeDefined();
  expect(process.status).toEqual(ProcessStatus.UNSTARTED);
});

test("Engine create process without permission", async () => {
  //const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
  const process = await engine.createProcess(workflow.id, actors_.simpleton);
  expect(process.id).toBeUndefined();
  expect(process.status).toEqual(ProcessStatus.FORBIDDEN);
});

test("Engine create process by workflow name", async () => {
  //const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);
  expect(process.id).toBeDefined();
  expect(process.status).toEqual(ProcessStatus.UNSTARTED);
});

test("Engine create process without permission by workflow name", async () => {
  //const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
  const process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);
  expect(process.id).toBeUndefined();
  expect(process.status).toEqual(ProcessStatus.FORBIDDEN);
});

test("Engine create process with data", async () => {
  //const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.start_with_data);
  const create_data = { number: 9999, name: "createName" };
  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton, create_data);
  process = await engine.runProcess(process.id);
  expect(process.state.status).toEqual(ProcessStatus.WAITING);
  //won´t put initial_bag into start result
  //expect(process.state.result.start_data).toStrictEqual(create_data);
  expect(process.state.bag).toStrictEqual(create_data);
});

test("Engine create process with missing data but run fails", async () => {
  //const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.start_with_data);
  const create_data = {};
  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton, create_data);
  process = await engine.runProcess(process.id);
  expect(process.state.status).toEqual(ProcessStatus.ERROR);
  const error = process.state.error;
  expect(error).toBeDefined();
  expect(error).toMatch("number");
  expect(error).toMatch("name");
  expect(process.state.result).toBeNull();
  expect(process.state.bag).toStrictEqual(create_data);
});

describe("Run existing process", () => {
  //const engine = new Engine(...settings.persist_options);

  async function createProcess(blueprint, actor_data) {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprint);
    return await engine.createProcess(workflow.id, actor_data);
  }

  test("Engine run process with timers", async () => {
    const process = await createProcess(blueprints_.timer, actors_.simpleton);
    await engine.runProcess(process.id, actors_.simpleton);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(2000);

    const result_process = await engine.fetchProcess(process.id);

    expect(result_process.status).toEqual(ProcessStatus.FINISHED);
  });

  test("Engine run new process", async () => {
    jest.setTimeout(60000);
    const process = await createProcess(blueprints_.minimal, actors_.simpleton);
    const result_process = await engine.runProcess(process.id, actors_.simpleton);

    expect(result_process.status).toEqual(ProcessStatus.FINISHED);
  });

  test("Engine run new process without permission", async () => {
    const process = await createProcess(blueprints_.admin_identity_system_task, actors_.admin);
    const result_process = await engine.runProcess(process.id, actors_.simpleton);

    expect(result_process.status).toEqual(ProcessStatus.FORBIDDEN);
  });

  test("Engine run awaiting process", async () => {
    const process = await createProcess(blueprints_.identity_user_task, actors_.simpleton);
    let result_process = await engine.runProcess(process.id, actors_.simpleton);

    expect(result_process.status).toEqual(ProcessStatus.WAITING);

    result_process = await engine.runProcess(process.id, actors_.simpleton, { input: "value" });

    expect(result_process.status).toEqual(ProcessStatus.FINISHED);
  });

  test("Engine run awaiting process without permission", async () => {
    const process = await createProcess(blueprints_.admin_identity_user_task, actors_.admin);
    let result_process = await engine.runProcess(process.id, actors_.admin);

    expect(result_process.status).toEqual(ProcessStatus.WAITING);

    result_process = await engine.runProcess(process.id, actors_.simpleton, { input: "value" });

    expect(result_process.status).toEqual(ProcessStatus.FORBIDDEN);
  });

  test("Engine run on finished process", async () => {
    const process = await createProcess(blueprints_.minimal, actors_.simpleton);
    let result_process = await engine.runProcess(process.id, actors_.simpleton);

    expect(result_process.status).toEqual(ProcessStatus.FINISHED);

    result_process = await engine.runProcess(process.id, actors_.simpleton);

    expect(result_process.status).toEqual(ProcessStatus.FORBIDDEN);
  });

  test("Engine run process with timeout", async () => {
    jest.setTimeout(60000);
    const process = await createProcess(blueprints_.start_with_timeout, actors_.simpleton);
    //console.log("Engine run process with timeout:", process._id);
    await engine.runProcess(process.id, actors_.simpleton);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(8000);

    const result_process = await engine.fetchProcess(process.id);

    expect(result_process.status).toEqual(ProcessStatus.EXPIRED);
    const activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);
  });

  test("Engine finish activity manager on process error", async () => {
    const actor_data = {
      id: "1",
      claims: [],
    };

    const process = await createProcess(blueprints_.user_action_with_system_task, actor_data);
    await engine.runProcess(process.id, actor_data);

    let state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.WAITING);

    await engine.runProcess(process.id, actor_data, {});
    state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.ERROR);

    const available_activity_managers = await engine.fetchAvailableActivitiesForActor(actor_data);
    expect(available_activity_managers).toHaveLength(0);

    const interrupted_activity_manager = await process._fetchActivityManagerFromProcessId(
      process.id,
      actor_data,
      "interrupted"
    );
    expect(interrupted_activity_manager.activity_status).toBe("interrupted");
  });

  test("Engine finish activity manager on process finished", async () => {
    const actor_data = {
      id: "1",
      claims: [],
    };

    const process = await createProcess(blueprints_.user_action, actor_data);
    await engine.runProcess(process.id, actor_data);

    let state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.WAITING);

    await engine.runProcess(process.id, actor_data, { userInput: "user input" });
    state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.FINISHED);

    const available_activity_managers = await engine.fetchAvailableActivitiesForActor(actor_data);
    expect(available_activity_managers).toHaveLength(0);

    const completed_activity_manager = await process._fetchActivityManagerFromProcessId(
      process.id,
      actor_data,
      "completed"
    );
    expect(completed_activity_manager.activity_status).toBe("completed");
  });

  test("Engine finish activity manager on process interrupted", async () => {
    const actor_data = {
      id: "1",
      claims: [],
    };

    const process = await createProcess(blueprints_.user_action_with_system_task, actor_data);
    await engine.runProcess(process.id, actor_data);

    let state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.WAITING);

    await engine.abortProcess(process.id);

    state_history = await engine.fetchProcess(process.id);
    expect(state_history.status).toEqual(ProcessStatus.INTERRUPTED);

    const available_activity_managers = await engine.fetchAvailableActivitiesForActor(actor_data);
    expect(available_activity_managers).toHaveLength(0);

    const interrupted_activity_manager = await process._fetchActivityManagerFromProcessId(
      process.id,
      actor_data,
      "interrupted"
    );
    expect(interrupted_activity_manager.activity_status).toBe("interrupted");
  });
});

test("process state notifier", async () => {
  //const engine = new Engine(...settings.persist_options);
  try {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);

    const notifier = jest.fn();
    engine.setProcessStateNotifier(notifier);

    const process = await engine.createProcess(workflow.id, actors_.simpleton);
    await engine.runProcess(process.id, actors_.simpleton);

    expect(notifier).toHaveBeenCalledTimes(3);
    expect(notifier).toHaveBeenCalledWith(expect.anything(), actors_.simpleton);
    for (const [process_state] of notifier.mock.calls) {
      expect(process_state.workflow_name).toEqual("sample");
    }
  } finally {
    engine.setProcessStateNotifier();
  }
});

test("activity manager notifier on run process", async () => {
  //const engine = new Engine(...settings.persist_options);
  try {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);

    let process = await engine.createProcess(workflow.id, actors_.simpleton);

    const notifier = jest.fn((data) => {
      expect(data._process_id).toEqual(process.id);
    });
    engine.setActivityManagerNotifier(notifier);

    process = await engine.runProcess(process.id, actors_.simpleton);

    expect(notifier).toHaveBeenCalledTimes(1);
  } finally {
    engine.setActivityManagerNotifier();
  }
});

test("activity manager notifier on activity commit", async () => {
  //const engine = new Engine(...settings.persist_options);
  try {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);

    let process = await engine.createProcess(workflow.id, actors_.simpleton);

    const notifier = jest.fn((data) => {
      expect(data._process_id).toEqual(process.id);
    });
    engine.setActivityManagerNotifier(notifier);

    process = await engine.runProcess(process.id, actors_.simpleton);
    const external_input = { any: "external_input" };
    await engine.commitActivity(process.id, actors_.simpleton, external_input);
    const result = await engine.pushActivity(process.id, actors_.simpleton);
    expect(result.error).toBeUndefined();
    expect(result.processPromise).toBeInstanceOf(Promise);
    await result.processPromise;

    expect(notifier).toHaveBeenCalledTimes(3);
  } finally {
    engine.setActivityManagerNotifier();
  }
});

test("run process using environment", async () => {
  const original_env_environment = process.env.ENVIRONMENT;
  const original_env_api_host = process.env.API_HOST;
  const original_env_payload = process.env.PAYLOAD;
  const original_env_limit = process.env.LIMIT;

  //const engine = new Engine(...settings.persist_options);
  try {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.reference_environment);

    let process_state_history = [];
    engine.setProcessStateNotifier((process_state) => process_state_history.push(process_state));

    process.env.ENVIRONMENT = "test";
    process.env.API_HOST = "https://koa-app:3000/test_api";
    process.env.PAYLOAD = "payload";
    process.env.LIMIT = "999";

    let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("unstarted");

    workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("waiting");

    const external_input = { any: "external_input" };
    workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton, external_input);
    expect(workflow_process.state.status).toEqual("finished");

    expect(process_state_history).toHaveLength(8);

    const state_set_to_bag = process_state_history[2];
    expect(state_set_to_bag.node_id).toEqual("2");
    expect(state_set_to_bag.bag).toEqual({ environment: "test" });
    expect(state_set_to_bag.result).toEqual({ timeout: undefined });

    const state_http = process_state_history[3];
    expect(state_http.node_id).toEqual("3");
    expect(state_http.result).toEqual({ status: 201, data: { response: "post_success" } });

    const state_script = process_state_history[4];
    expect(state_script.node_id).toEqual("4");
    expect(state_script.result).toEqual({ threshold: "999" });

    const state_user_start = process_state_history[5];
    expect(state_user_start.node_id).toEqual("5");
    expect(state_user_start.result).toEqual({ limit: "O limite é 999" });
  } finally {
    engine.setProcessStateNotifier();
    process.env.ENVIRONMENT = original_env_environment;
    process.env.API_HOST = original_env_api_host;
    process.env.PAYLOAD = original_env_payload;
    process.env.LIMIT = original_env_limit;
  }
});

test("run process that creaters another process", async () => {
  //const engine = new Engine(...settings.persist_options);
  try {
    const minimal_workflow = await engine.saveWorkflow("minimal", "minimal", blueprints_.minimal);
    const create_process_workflow = await engine.saveWorkflow(
      "create_process_minimal",
      "create process minimal",
      blueprints_.create_process_minimal
    );

      let process_state_history = [];
      engine.setProcessStateNotifier((process_state) => process_state_history.push(process_state));

      let workflow_process = await engine.createProcess(create_process_workflow.id, actors_.simpleton);
      expect(workflow_process.state.status).toEqual("unstarted");

      workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton);
      expect(workflow_process.state.status).toEqual("finished");

    const minimal_process_list = await engine.fetchProcessList({ workflow_id: minimal_workflow.id });
    expect(minimal_process_list).toHaveLength(1);

    const create_process_process_list = await engine.fetchProcessList({ workflow_id: create_process_workflow.id });
    expect(create_process_process_list).toHaveLength(1);

      const result = await engine.fetchProcess(create_process_process_list[0].id);
      expect(result.state.status).toEqual(ProcessStatus.FINISHED);
    } finally {
      engine.setProcessStateNotifier();
    }
  });

  test("child process has restricted input schema", async () => {
    const engine = new Engine(...settings.persist_options);

    const childWorkflow = await engine.saveWorkflow(
      "restricted_schema",
      "child process with restricted input schema",
      blueprints_.withRestrictedInputSchema
    );
    const parentWorkflow = await engine.saveWorkflow(
      "create_another_process",
      "parent process that creates a child process",
      blueprints_.createProcessWithRestrictedInputSchema
    );

    const parentProcess = await engine.createProcess(parentWorkflow.id, actors_.simpleton);
    expect(parentProcess.state.status).toEqual(ProcessStatus.UNSTARTED);

    const parentProcessState = await engine.runProcess(parentProcess.id, actors_.simpleton);
    expect(parentProcessState.state.status).toEqual(ProcessStatus.FINISHED);

    const childProcessList = await engine.fetchProcessList({ workflow_id: childWorkflow.id });
    expect(childProcessList).toHaveLength(1);

    const childState = await engine.fetchProcess(childProcessList[0].id);
    expect(childState.state.status).not.toBe(ProcessStatus.UNSTARTED);
    expect(childState.state.status).not.toBe(ProcessStatus.ERROR);
  });
});

// test("run process that abort another process", async () => {
//   const engine = new Engine(...settings.persist_options);
//
//   const user_task_workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
//   const abort_process_workflow = await engine.saveWorkflow("abort_process_minimal", "abort_process_minimal", blueprints_.abort_process_minimal);
//
//   let user_task_process = await engine.createProcess(user_task_workflow.id, actors_.simpleton);
//   user_task_process = await engine.runProcess(user_task_process.id, actors_.simpleton);
//   expect(user_task_process.state.status).toEqual(ProcessStatus.WAITING);
//
//   let abort_process = await engine.createProcess(abort_process_workflow.id, actors_.simpleton, {
//     process_list: [
//       user_task_process.id,
//       uuid(),
//     ]
//   });
//   abort_process = await engine.runProcess(abort_process.id, actors_.simpleton);
//   expect(abort_process.state.status).toEqual(ProcessStatus.FINISHED);
//
//   user_task_process = await engine.fetchProcess(user_task_process.id);
//   expect(user_task_process.state.status).toEqual(ProcessStatus.INTERRUPTED);
// });

describe("User task timeout", () => {
  //const engine = new Engine(...settings.persist_options);
  let actualTimeout;
  function wait(ms = 2000) {
    return new Promise((resolve) => {
      actualTimeout(resolve, ms);
    });
  }

  beforeEach(async () => {
    await engine.saveWorkflow("user_timeout", "user_timeout", blueprints_.user_timeout);
    actualTimeout = setTimeout;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("finish after timeout", async () => {
    jest.setTimeout(30000);
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    jest.runAllTimers();
    await wait();
    await Engine._beat();
    await wait();

    const process_state_history = await engine.fetchProcessStateHistory(process.id);

    expect(process_state_history).toHaveLength(5);
    let process_state = process_state_history[0];
    expect(process_state).toMatchObject({
      step_number: 5,
      node_id: "99",
      status: ProcessStatus.FINISHED,
      next_node_id: null,
    });

    process_state = process_state_history[1];
    expect(process_state).toMatchObject({
      step_number: 4,
      node_id: "2",
      status: ProcessStatus.RUNNING,
      next_node_id: "99",
      result: { is_continue: true },
    });

    //even when the userTask have expired, the actor_data should be preserved
    expect(process_state.actor_data).toBeDefined();

    process_state = process_state_history[2];
    expect(process_state).toMatchObject({
      step_number: 3,
      node_id: "2",
      status: ProcessStatus.WAITING,
      next_node_id: "2",
      result: {},
    });

    await Engine._beat();
    const activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);
  });

  test("commit reset timeout", async () => {
    jest.setTimeout(14000);
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    await wait();

    await engine.commitActivity(process.id, actors_.simpleton, { activity_data: "example_activity_data" });

    await wait();

    let process_state_history = await engine.fetchProcessStateHistory(process.id);
    expect(process_state_history).toHaveLength(3);
    let process_state = process_state_history[0];
    expect(process_state).toMatchObject({
      step_number: 3,
      node_id: "2",
      status: ProcessStatus.WAITING,
      next_node_id: "2",
      result: {},
    });

    jest.runAllTimers();
    await wait(2000);

    process_state_history = await engine.fetchProcessStateHistory(process.id);
    expect(process_state_history).toHaveLength(5);
    process_state = process_state_history[0];
    expect(process_state).toMatchObject({
      step_number: 5,
      node_id: "99",
      status: ProcessStatus.FINISHED,
      next_node_id: null,
      result: {},
    });
    process_state = process_state_history[1];
    expect(process_state).toMatchObject({
      step_number: 4,
      node_id: "2",
      status: ProcessStatus.RUNNING,
      next_node_id: "99",
      result: {
        is_continue: true,
      },
    });
    const activities = process_state.result.activities;
    expect(activities).toHaveLength(1);
    process_state = process_state_history[2];
    expect(process_state).toMatchObject({
      step_number: 3,
      node_id: "2",
      status: ProcessStatus.WAITING,
      next_node_id: "2",
      result: {},
    });

    const activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);
  });

  test("finish before timeout", async () => {
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    await engine.commitActivity(process.id, actors_.simpleton, { activity_data: "example_activity_data" });
    const result = await engine.pushActivity(process.id, actors_.simpleton);
    expect(result.error).toBeUndefined();
    expect(result.processPromise).toBeInstanceOf(Promise);
    await result.processPromise;

    function validateProcessStateHistory(process_state_history) {
      expect(process_state_history).toHaveLength(5);
      let process_state = process_state_history[0];
      expect(process_state).toMatchObject({
        step_number: 5,
        node_id: "99",
        status: ProcessStatus.FINISHED,
        next_node_id: null,
      });

      process_state = process_state_history[1];
      expect(process_state).toMatchObject({
        step_number: 4,
        node_id: "2",
        status: ProcessStatus.RUNNING,
        next_node_id: "99",
        result: {},
      });
      const activities = process_state.result.activities;
      expect(activities).toHaveLength(1);
      expect(activities[0].data).toEqual({ activity_data: "example_activity_data" });

      process_state = process_state_history[2];
      expect(process_state).toMatchObject({
        step_number: 3,
        node_id: "2",
        status: ProcessStatus.WAITING,
        next_node_id: "2",
        result: {},
      });
    }

    let process_state_history = await engine.fetchProcessStateHistory(process.id);
    validateProcessStateHistory(process_state_history);

    let activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);

    jest.runAllTimers();
    await wait();

    process_state_history = await engine.fetchProcessStateHistory(process.id);
    validateProcessStateHistory(process_state_history);

    activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);
  });

  test("run process before timeout", async () => {
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    await engine.runProcess(process.id, actors_.simpleton, { activity_data: "example_activity_data" });

    function validateProcessStateHistory(process_state_history) {
      expect(process_state_history).toHaveLength(5);
      let process_state = process_state_history[0];
      expect(process_state).toMatchObject({
        step_number: 5,
        node_id: "99",
        status: ProcessStatus.FINISHED,
        next_node_id: null,
      });

      process_state = process_state_history[1];
      expect(process_state).toMatchObject({
        step_number: 4,
        node_id: "2",
        status: ProcessStatus.RUNNING,
        next_node_id: "99",
        result: {},
      });
      const activities = process_state.result.activities;
      expect(activities).toBeUndefined();
      expect(process_state.result).toEqual({ activity_data: "example_activity_data" });

      process_state = process_state_history[2];
      expect(process_state).toMatchObject({
        step_number: 3,
        node_id: "2",
        status: ProcessStatus.WAITING,
        next_node_id: "2",
        result: {},
      });
    }

    let process_state_history = await engine.fetchProcessStateHistory(process.id);
    validateProcessStateHistory(process_state_history);

    let activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);

    jest.runAllTimers();
    await wait(3000);
    await Engine._beat();

    process_state_history = await engine.fetchProcessStateHistory(process.id);
    validateProcessStateHistory(process_state_history);

    activity_managers = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_managers).toHaveLength(0);
  });

  test("timeout do not continue another user task", async () => {
    await engine.saveWorkflow("user_timeout_user", "user_timeout_user", blueprints_.user_timeout_user);

    const process = await engine.createProcessByWorkflowName("user_timeout_user", actors_.simpleton);
    const process_id = process.id;
    await engine.runProcess(process_id);
    await engine.runProcess(process_id, actors_.simpleton, { activity_data: "example_activity_data" });

    let process_state_history = await engine.fetchProcessStateHistory(process_id);
    expect(process_state_history).toHaveLength(5);

    jest.runAllTimers();
    await wait();

    process_state_history = await engine.fetchProcessStateHistory(process_id);
    expect(process_state_history).toHaveLength(5);
  });
});

test("Commit activity only on type 'commit' activity manager", async () => {
  const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.notify_and_user_task);

  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);

  const activity_managers = [];
  const notifier = (data) => {
    activity_managers.push(data);
  };
  engine.setActivityManagerNotifier(notifier);

  process = await engine.runProcess(process.id, actors_.simpleton);
  expect(process.state.node_id).toEqual("3");
  expect(activity_managers).toHaveLength(2);

  const external_input = { data: "external_input" };
  await engine.commitActivity(process.id, actors_.simpleton, external_input);

  const notify_activity_manager = await engine.fetchActivityManager(activity_managers[0]._id, actors_.simpleton);
  expect(notify_activity_manager.type).toEqual("notify");
  expect(notify_activity_manager.activities).toHaveLength(0);

  const commit_activity_manager = await engine.fetchActivityManager(activity_managers[1]._id, actors_.simpleton);
  expect(commit_activity_manager.type).toEqual("commit");
  expect(commit_activity_manager.activities).toHaveLength(0);
});

test("Push activity only on type 'commit' activity manager", async () => {
  //const engine = new Engine(...settings.persist_options);
  await engine.saveWorkflow("sample", "sample", blueprints_.notify_and_user_task);

  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);

  const activity_managers = [];
  const notifier = (data) => {
    activity_managers.push(data);
  };
  engine.setActivityManagerNotifier(notifier);

  process = await engine.runProcess(process.id, actors_.simpleton);
  expect(process.state.node_id).toEqual("3");
  expect(activity_managers).toHaveLength(2);

  const result = await engine.pushActivity(process.id, actors_.simpleton);
  expect(result.error).toBeUndefined();
  expect(result.processPromise).toBeInstanceOf(Promise);
  await result.processPromise;

  const notify_activity_manager = await engine.fetchActivityManager(activity_managers[0]._id, actors_.simpleton);
  expect(notify_activity_manager.type).toEqual("notify");
  expect(notify_activity_manager.activity_status).toEqual("started");

  const commit_activity_manager = await engine.fetchActivityManager(activity_managers[1]._id, actors_.simpleton);
  expect(commit_activity_manager.type).toEqual("commit");
  expect(commit_activity_manager.activity_status).toEqual("completed");
});

const _clean = async () => {
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
};
