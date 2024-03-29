const settings = require("../../../../settings/tests/settings");
const { Engine } = require("../../engine");
const { PersistorProvider } = require("../../../core/persist/provider");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const { Process } = require("../../../core/workflow/process");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");
const { Timer } = require("../../../core/workflow/timer");
const { v1: uuid } = require("uuid");

const { promisify } = require("util");
const sleep = promisify(setTimeout);

let engine;

beforeAll(() => {
  engine = new Engine(...settings.persist_options);
  jest.setTimeout(60000);
});

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  Engine.kill();
  await _clean();
  if (settings.persist_options[0] === "knex") {
    await Process.getPersist()._db.destroy();
  }
});

test("Workflow should not work with missing requirements", async () => {
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.missing_requirements);
  let process = await engine.createProcess(workflow.id, actors_.simpleton);
  process = await engine.runProcess(process.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.ERROR);
  expect(process.state.error).toMatch("Couldn't execute scripted function");
});

test("Engine create process", async () => {
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const process = await engine.createProcess(workflow.id, actors_.simpleton);
  expect(process.id).toBeDefined();
  expect(process.status).toEqual(ProcessStatus.UNSTARTED);
});

test("Engine create process without permission", async () => {
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
  const process = await engine.createProcess(workflow.id, actors_.simpleton);
  expect(process.id).toBeUndefined();
  expect(process.status).toEqual(ProcessStatus.FORBIDDEN);
});

test("Engine create process by workflow name", async () => {
  await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);
  expect(process.id).toBeDefined();
  expect(process.status).toEqual(ProcessStatus.UNSTARTED);
});

test("Engine create process without permission by workflow name", async () => {
  await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
  const process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);
  expect(process.id).toBeUndefined();
  expect(process.status).toEqual(ProcessStatus.FORBIDDEN);
});

test("Engine create process with data", async () => {
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
  await engine.saveWorkflow("sample", "sample", blueprints_.start_with_data);
  const create_data = {};
  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton, create_data);
  process = await engine.runProcess(process.id);
  expect(process.state.status).toEqual(ProcessStatus.ERROR);
  const error = process.state.error;
  expect(error).toBeDefined();
  expect(error).toMatch("number");
  expect(error).toMatch("name");
  expect(process.state.result).toStrictEqual({ step_number: 2 });
  expect(process.state.bag).toStrictEqual(create_data);
});

describe("Run existing process", () => {
  async function createProcess(blueprint, actor_data, input) {
    const workflow = await engine.saveWorkflow("sample", "sample", blueprint);
    return await engine.createProcess(workflow.id, actor_data, input);
  }

  test("Engine run process with timers", async () => {
    const process = await createProcess(blueprints_.timer, actors_.simpleton);
    await engine.runProcess(process.id, actors_.simpleton);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(2000);

    await Engine._beat();

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
    const process = await createProcess(blueprints_.start_with_timeout, actors_.simpleton, { abort_this_process: true });
    await engine.runProcess(process.id, actors_.simpleton);

    await Engine._beat();

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(8000);

    const result_process = await engine.fetchProcess(process.id);

    expect(result_process.status).toEqual(ProcessStatus.EXPIRED);
    expect(result_process.state.bag).toEqual({ abort_this_process: true });
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

  try {
    process.env.ENVIRONMENT = "test";
    process.env.API_HOST = "https://koa-app:3000/test_api";
    process.env.PAYLOAD = "payload";
    process.env.LIMIT = "999";

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.reference_environment);

    let process_state_history = [];
    engine.setProcessStateNotifier((process_state) => process_state_history.push(process_state));

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
    expect(state_set_to_bag.result).toEqual({ timeout: undefined, step_number: 3 });

    const state_http = process_state_history[3];
    expect(state_http.node_id).toEqual("3");
    expect(state_http.result).toEqual({
      step_number: 4,
      status: 201,
      data: {
        response: "post_success",
      },
    });

    const state_script = process_state_history[4];
    expect(state_script.node_id).toEqual("4");
    expect(state_script.result).toEqual({ step_number: 5, threshold: "999" });

    const state_user_start = process_state_history[5];
    expect(state_user_start.node_id).toEqual("5");
    expect(state_user_start.result).toEqual({ step_number: 6, limit: "O limite é 999" });
  } finally {
    engine.setProcessStateNotifier();
    process.env.ENVIRONMENT = original_env_environment;
    process.env.API_HOST = original_env_api_host;
    process.env.PAYLOAD = original_env_payload;
    process.env.LIMIT = original_env_limit;
  }
});

test("run process with http retries", async () => {
  const original_env_environment = process.env.ENVIRONMENT;
  const original_env_api_host = process.env.API_HOST;
  const original_env_payload = process.env.PAYLOAD;
  const original_env_limit = process.env.LIMIT;

  try {
    process.env.ENVIRONMENT = "test";
    process.env.API_HOST = "https://postman-echo.com/status/503";
    process.env.PAYLOAD = "payload";
    process.env.LIMIT = "999";

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.http_retries);

    let process_state_history = [];
    engine.setProcessStateNotifier((process_state) => process_state_history.push(process_state));

    let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("unstarted");

    workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton);

    await sleep(5000);

    expect(process_state_history).toHaveLength(6);

    let http_script = process_state_history[2];
    expect(http_script.node_id).toEqual("2");
    expect(http_script.result).toEqual({
      attempt: 1,
      data: "",
      status: 503,
      step_number: 3,
      timeout: 1,
    });

    http_script = process_state_history[3];
    expect(http_script.node_id).toEqual("2");
    expect(http_script.result).toEqual({
      attempt: 2,
      data: "",
      status: 503,
      step_number: 4,
      timeout: 1,
    });

    http_script = process_state_history[4];
    expect(http_script.node_id).toEqual("2");
    expect(http_script.result).toEqual({
      attempt: 3,
      data: "",
      status: 503,
      step_number: 5,
      timeout: 1,
    });
  } finally {
    engine.setProcessStateNotifier();
    process.env.ENVIRONMENT = original_env_environment;
    process.env.API_HOST = original_env_api_host;
    process.env.PAYLOAD = original_env_payload;
    process.env.LIMIT = original_env_limit;
  }
});

test("run process that creaters another process", async () => {
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

test("run successfully process that creates sub process", async () => {
  const parent_workflow = await engine.saveWorkflow(
    "parent_workflow",
    "parent workflow",
    blueprints_.sub_process.blueprint_spec
  );
  const child_workflow = await engine.saveWorkflow("blueprint_spec_son", "child workflow", blueprints_.minimal);

  let parent_process = await engine.createProcess(parent_workflow.id, actors_.simpleton);
  expect(parent_process.state.status).toEqual("unstarted");

  parent_process = await engine.runProcess(parent_process.id, actors_.simpleton);
  expect(parent_process.state.status).toEqual("delegated");

  while (parent_process.state.status === "delegated" || parent_process.state.status === "running") {
    parent_process = await engine.fetchProcess(parent_process.id);
  }
  const child_process_list = await engine.fetchProcessList({ workflow_id: child_workflow.id });
  expect(child_process_list).toHaveLength(1);

  const parent_process_list = await engine.fetchProcessList({ workflow_id: parent_workflow.id });
  expect(parent_process_list).toHaveLength(1);

  const result_parent = await engine.fetchProcess(parent_process.id);
  expect(result_parent.state.status).not.toEqual(ProcessStatus.DELEGATED);

  const result_child = await engine.fetchProcess(child_process_list[0].id);
  expect(result_child.state.status).toEqual(ProcessStatus.FINISHED);
});

test("error running process that creates unexisted sub process", async () => {
  const parent_workflow = await engine.saveWorkflow(
    "parent_workflow",
    "parent workflow",
    blueprints_.sub_process.blueprint_spec
  );

  let parent_process = await engine.createProcess(parent_workflow.id, actors_.simpleton);
  expect(parent_process.state.status).toEqual("unstarted");

  parent_process = await engine.runProcess(parent_process.id, actors_.simpleton);
  expect(parent_process.state.status).toEqual("error");
});

describe("User task timeout", () => {
  beforeEach(async () => {
    await engine.saveWorkflow("user_timeout", "user_timeout", blueprints_.user_timeout);
  });

  test("finish after timeout", async () => {
    jest.setTimeout(10000);
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    await sleep(2000);
    await engine.constructor._beat();
    await sleep(2000);

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

    // even when the userTask have expired, the actor_data should be preserved
    expect(process_state.actor_data).toBeDefined();

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

  test("commit reset timeout", async () => {
    const process = await engine.createProcessByWorkflowName("user_timeout", actors_.simpleton);
    await engine.runProcess(process.id);

    await engine.commitActivity(process.id, actors_.simpleton, { activity_data: "example_activity_data" });

    await sleep(2000);

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

    await sleep(2000);

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

    await sleep(2000);

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
      expect(process_state.result).toEqual({ activity_data: "example_activity_data", step_number: 4 });

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

    await sleep(3000);
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

    await sleep(2000);

    process_state_history = await engine.fetchProcessStateHistory(process_id);
    expect(process_state_history).toHaveLength(5);
  });
});

test("Commit activity only on type 'commit' activity manager", async () => {
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
  await engine.saveWorkflow("sample", "sample", blueprints_.notify_and_2_user_task);

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

describe("Run process with _extract true", () => {
  test("process with _extract true works", async () => {
    await engine.saveWorkflow("blueprint_spec_son", "child workflow", blueprints_.minimal);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.extract_blueprint);

    let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("unstarted");
    
    workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("pending");
    
    await sleep(2500);
    workflow_process = await Process.fetch(workflow_process.id);
    expect(workflow_process.state.status).toEqual("waiting");

    let activity_manager = await engine.fetchAvailableActivityForProcess(workflow_process.id, actors_.simpleton);
    const activity_data = { extracted: true };
    const { processPromise, error } = await engine.submitActivity(
      activity_manager.id,
      actors_.simpleton,
      activity_data
    );
    expect(error).toBeUndefined();

    workflow_process = await processPromise;
    expect(workflow_process.state.status).toBe("finished");
    expect(workflow_process.state.node_id).toBe("FINISH-SUCCESS");
    expect(workflow_process.state.bag.user_task_node.extracted).toBeTruthy();
    expect(workflow_process.state.bag.start_process_node.process_id).toBeDefined();
    expect(workflow_process.state.bag.start).toBeUndefined();
    expect(workflow_process.state.bag.config).toBeUndefined();
    expect(workflow_process.state.bag.timer).toBeUndefined();
    expect(workflow_process.state.bag.flow).toBeUndefined();
  });
});

describe("Run process extract in nodes", () => {
  test("process with extract in nodes works", async () => {
    await engine.saveWorkflow("blueprint_spec_son", "child workflow", blueprints_.minimal);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.extract_node_blueprint);

    let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
    expect(workflow_process.state.status).toEqual("unstarted");

    workflow_process = await engine.runProcess(workflow_process.id, actors_.simpleton);
    workflow_process = await Process.fetch(workflow_process.id);
    expect(workflow_process.state.status).toEqual("waiting");

    let activity_manager = await engine.fetchAvailableActivityForProcess(workflow_process.id, actors_.simpleton);
    const activity_data = { extracted: true };
    const { processPromise, error } = await engine.submitActivity(
      activity_manager.id,
      actors_.simpleton,
      activity_data
    );
    expect(error).toBeUndefined();

    workflow_process = await processPromise;
    expect(workflow_process.state.status).toBe("finished");
    expect(workflow_process.state.node_id).toBe("END");
    expect(workflow_process.state.bag.activity.extracted).toBeTruthy();
    expect(workflow_process.state.bag.startprocessdata.process_id).toBeDefined();
  });
});

test.skip("Push activity should return error to an non-existant activity manager", async () => {
  await engine.saveWorkflow("sample", "sample", blueprints_.notify_and_2_user_task);

  let process = await engine.createProcessByWorkflowName("sample", actors_.simpleton);

  const activity_managers = [];
  const notifier = (data) => {
    activity_managers.push(data);
  };
  engine.setActivityManagerNotifier(notifier);

  process = await engine.runProcess(process.id, actors_.simpleton);
  expect(process.state.node_id).toEqual("3");

  const firstCall = await engine.pushActivity(process.id, actors_.simpleton);
  expect(firstCall.error).toBeUndefined();

  const secondCall = await engine.pushActivity(process.id, actors_.simpleton);
  expect(secondCall.error).toBeDefined();
});

test("Beat won't break despite orphan timer", async () => {
  jest.setTimeout(60000);
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const workflow = await engine.saveWorkflow(
    "user_timeout_one_hour",
    "user_timeout_one_hour",
    blueprints_.user_timeout_one_hour
  );

  let process = await engine.createProcess(workflow.id, actors_.simpleton);
  process = await engine.runProcess(process.id, actors_.simpleton);

  expect(process.status).toEqual(ProcessStatus.WAITING);

  let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
  expect(activity_manager.id).toBeDefined();

  process = await engine.abortProcess(process.id);
  expect(process.status).toBe(ProcessStatus.INTERRUPTED);

  let timer = new Timer("Process", process.id, Timer.timeoutFromNow(10), {});
  await timer.save();

  let timer2 = new Timer("ActivityManager", activity_manager.id, Timer.timeoutFromNow(10), {});
  await timer2.save();

  let timer3 = new Timer("Mock", uuid(), Timer.timeoutFromNow(10), {});
  await timer3.save();

  for (let i = 0; i < 5; i++) {
    await delay(2000);
    await Engine._beat();
  }
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_state_persist = persistor.getPersistInstance("ProcessState");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  const timer_persist = persistor.getPersistInstance("Timer");

  await activity_persist.deleteAll();
  await activity_manager_persist.deleteAll();
  await process_state_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
  await timer_persist.deleteAll();
};
