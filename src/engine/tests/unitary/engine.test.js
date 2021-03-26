const _ = require("lodash");
const {v1: uuid }= require('uuid');
const lisp = require("../../../core/lisp");
const settings = require("../../../../settings/tests/settings");
const { Engine } = require("../../engine");
const { PersistorProvider } = require("../../../core/persist/provider");
const { ProcessState, ProcessStatus } = require("../../../core/workflow/process_state");
const { Process } = require("../../../core/workflow/process");
const { Workflow } = require("../../../core/workflow/workflow");
const { Packages } = require("../../../core/workflow/packages");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");
const { packages_ } = require("../../../core/workflow/tests/unitary/packages_samples");
const extra_nodes = require("../utils/extra_nodes");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  Engine.kill();
  await _clean();
  if (settings.persist_options[0] === "knex"){
    await Process.getPersist()._db.destroy();
  }
});

async function createRunProcess(engine, workflow_id, actor_data) {
  let process = await engine.createProcess(workflow_id, actor_data);
  if (process.id) {
    process = await engine.runProcess(process.id, actor_data);
  }
  return process;
}

test("constructor works", () => {
  const engine = new Engine(...settings.persist_options);
  expect(engine).toBeInstanceOf(Engine);
});

test("create and run process for system tasks", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
  const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FINISHED);
});

test("create and run process for user tasks", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
  const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.WAITING);
});

test("create and run process for restricted system tasks", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_system_task);
  let process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.FINISHED);

  process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);
});

test("create and run process for restricted user tasks", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
  let process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.WAITING);

  process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);
});

test("create and run process for restricted multilane system tasks", async() => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.restricted_multilane_identity_user_task);
  let process = await createRunProcess(engine, workflow.id, actors_.sys_admin);
  process = await engine.runProcess(process.id, actors_.sys_admin, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FINISHED);

  process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.WAITING);
  expect(process.state.node_id).toBe("4");

  process = await engine.runProcess(process.id, actors_.admin, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);

  process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);
});

test("create and run process accordingly when node run throws error", async () => {
  const StartNode = require("../../../core/workflow/nodes").StartNode;
  const spy = jest.spyOn(StartNode.prototype, "_run");
  spy.mockImplementation(() => { throw new Error("mock"); });

  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.ERROR);

  spy.mockRestore();
});

test("create and run process with prepare lisp function", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.lisp_prepare);
  const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FINISHED);
  expect(process.state.bag).toStrictEqual({"new_bag": "Prepare New Bag"});
});

test("create and run process with requirements lisp functions", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.lisp_requirements);
  const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FINISHED);
  expect(process.state.bag).toStrictEqual({"new_bag": "New Bag 1"});
});

test("create and run process with default encryption", async () => {
  const engine = new Engine(...settings.persist_options);

  const crypto = engine.buildCrypto("", { key: "12345678901234567890123456789012" });
  expect(crypto).toBeDefined();
  engine.setCrypto(crypto);

  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_encrypt);
  let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toEqual(ProcessStatus.WAITING);

  const user_input = "example user input";
  process = await engine.runProcess(process.id, actors_.simpleton, { value: user_input });
  expect(process.status).toEqual(ProcessStatus.FINISHED);
  expect(process.state.bag).toBeDefined();
  expect(process.state.bag.crypted).not.toEqual(user_input);
  expect(process.state.bag.decrypted).toEqual(user_input);
});

test("runProcess works with prepare and requirements lisp functions", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.lisp_requirements_prepare);
  let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.WAITING);
  expect(process.state.bag).toStrictEqual({"new_bag": "New Bag"});
  process = await engine.runProcess(process.id, actors_.simpleton, {external_input: "external_input"});
  expect(process.status).toBe(ProcessStatus.FINISHED);
  expect(process.state.bag).toStrictEqual({"new_bag": "New Bag 2"});
});

test("runProcess works for user tasks", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
  let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.WAITING);

  process = await engine.runProcess(process.id, actors_.simpleton, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FINISHED);
});

test("runProcess works for restricted multilane system tasks", async() => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.restricted_multilane_identity_user_task);
  let process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.WAITING);

  process = await engine.runProcess(process.id, actors_.admin, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);

  process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);

  process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.WAITING);

  process = await engine.runProcess(process.id, actors_.simpleton, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FORBIDDEN);

  process = await createRunProcess(engine, workflow.id, actors_.admin);
  expect(process.status).toBe(ProcessStatus.WAITING);

  process = await engine.runProcess(process.id, actors_.sys_admin, {"data": 1});
  expect(process.status).toBe(ProcessStatus.FINISHED);
});

test("runProcess that uses actor_data", async() => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.use_actor_data);
  let process = await createRunProcess(engine, workflow.id, actors_.manager);
  expect(process.status).toEqual(ProcessStatus.WAITING);

  process = await engine.runProcess(process.id, actors_.admin, {data: 22});
  expect(process.status).toEqual(ProcessStatus.FINISHED);

  expect(process._state._bag).toStrictEqual({ runUser: actors_.manager, continueUser: actors_.admin});
})

describe("abortProcess", () => {
  test("abortProcess works", async () => {
    const engine = new Engine(...settings.persist_options);

    try {
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
      let process = await createRunProcess(engine, workflow.id, actors_.admin);
      expect(process.status).toBe(ProcessStatus.WAITING);

      const mock_process_state_notifier = jest.fn();
      engine.setProcessStateNotifier(mock_process_state_notifier);
    
      process = await engine.abortProcess(process.id);
      expect(process.status).toBe(ProcessStatus.INTERRUPTED);
  
      expect(mock_process_state_notifier).toHaveBeenCalledTimes(1);
      const notify_call_args = mock_process_state_notifier.mock.calls[0];
      expect(notify_call_args).toHaveLength(2);
      const state = notify_call_args[0];
      expect(state.status).toBe(ProcessStatus.INTERRUPTED);
      expect(state.workflow_name).toEqual("sample");
    } finally {
      engine.setProcessStateNotifier();
    }
  });

  test("abortProcess returns undefined if failed", async () => {
    const engine = new Engine(...settings.persist_options);
  
    const process = await engine.abortProcess(uuid());
    expect(process).toBeUndefined();
  });

  test("abortProcess should interrupt opened ActivityManagers", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    process = await engine.abortProcess(process.id);

    activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager).toBeUndefined();
  });
});

test("saveWorkflow works", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  expect(workflow).toBeInstanceOf(Workflow);
});

test("savePackage works", async () => {
  const engine = new Engine(...settings.persist_options);
  const package_ = await engine.savePackage("sample", "sample", packages_.test_package);
  expect(package_).toBeInstanceOf(Packages);
});

test("fetchPackage works", async () => {
  const engine = new Engine(...settings.persist_options);
  const package_ = await engine.savePackage("sample", "sample", packages_.test_package);
  expect(package_).toBeInstanceOf(Packages);
  const fetched_package = await engine.fetchPackage(package_.id);
  expect(fetched_package).toBeInstanceOf(Packages);
});

test("deletePackage works", async () => {
  const engine = new Engine(...settings.persist_options);
  const package_ = await engine.savePackage("sample", "sample", packages_.test_package);
  expect(package_).toBeInstanceOf(Packages);
  await engine.deletePackage(package_.id);
  const fetched_package = await engine.fetchPackage(package_.id);
  expect(fetched_package).toBeFalsy();
});

test("fetchWorkflow works", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  const fetched_workflow = await engine.fetchWorkflow(workflow.id);
  expect(fetched_workflow.id).toBe(workflow.id);
});

test("deleteWorkflow works", async () => {
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
  let fetched_workflow = await engine.fetchWorkflow(workflow.id);
  expect(fetched_workflow.id).toBe(workflow.id);
  await engine.deleteWorkflow(workflow.id);
  fetched_workflow = await engine.fetchWorkflow(workflow.id);
  expect(fetched_workflow).toBeFalsy();
});

test("Validation of extra node works", async () => {
  const engine = new Engine(...settings.persist_options);
  engine.addCustomSystemCategory(extra_nodes);
  const custom_bluprint = _.cloneDeep(blueprints_.extra_nodes);
  const exampleNode = custom_bluprint.nodes.find((node) => node.category === 'example');
  delete exampleNode.parameters.example;
  await expect(engine.saveWorkflow("sample", "sample", custom_bluprint)).rejects.toThrowError("parameters_has_example");
});

test("Extra node works", async () => {
  const engine = new Engine(...settings.persist_options);
  engine.addCustomSystemCategory(extra_nodes);
  const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.extra_nodes);
  let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
  expect(process.status).toBe(ProcessStatus.FINISHED);
});

describe('submitActivity', () => {
  test("submit process external_input with activities", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    const activity_data = { userInput: "example user input" };
    const { processPromise, error } = await engine.submitActivity(activity_manager.id, actors_.simpleton, activity_data);
    expect(error).toBeUndefined();
    expect(processPromise).toBeDefined();

    process = await processPromise;
    expect(process.status).toEqual(ProcessStatus.FINISHED);

    const process_state_hisotry = await engine.fetchProcessStateHistory(process.id);
    const user_task_result = process_state_hisotry[1];
    expect(user_task_result.node_id).toEqual("2");
    const activities = user_task_result.external_input.activities;
    expect(activities).toHaveLength(1);
    const activity = activities[0];
    expect(activity.data).toEqual(activity_data);
  });

  test("submit process twice external_input with activities", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    const activity_data = { userInput: "example user input" };
    let result = await engine.submitActivity(activity_manager.id, actors_.simpleton, activity_data);
    expect(result.error).toBeUndefined();
    expect(result.processPromise).toBeDefined();

    process = await result.processPromise;
    expect(process.status).toEqual(ProcessStatus.FINISHED);

    result = await engine.submitActivity(activity_manager.id, actors_.simpleton, activity_data);
    expect(result.error).toBeDefined();

    const process_state_hisotry = await engine.fetchProcessStateHistory(process.id);
    const user_task_result = process_state_hisotry[1];
    expect(user_task_result.node_id).toEqual("2");
    const activities = user_task_result.external_input.activities;
    expect(activities).toHaveLength(1);
    const activity = activities[0];
    expect(activity.data).toEqual(activity_data);
  });

  test("submit notify activity manager", async () => {
    const engine = new Engine(...settings.persist_options);
    await engine.saveWorkflow("notify_and_user", "notify_and_user", blueprints_.notify_and_user_task);

    const activity_managers = [];
    engine.setActivityManagerNotifier((activityManager) => activity_managers.push(activityManager));

    let process = await engine.createProcessByWorkflowName("notify_and_user", actors_.simpleton);

    process = await engine.runProcess(process.id);

    expect(activity_managers).toHaveLength(2);
    const notify_activity_manager = activity_managers[0];
    expect(notify_activity_manager._type).toEqual("notify");

    const external_input = {
      data: "exampleData"
    };

    const submit_result = await engine.submitActivity(notify_activity_manager._id, actors_.simpleton, external_input);
    expect(submit_result).toBeDefined();
    expect(submit_result.error).toBeUndefined();
    expect(submit_result.processPromise).toBeInstanceOf(Promise);
    process = await submit_result.processPromise;
    expect(process.state.status).toEqual("waiting");

    const activity_manager_data = await engine.fetchActivityManager(notify_activity_manager._id, actors_.simpleton);
    expect(activity_manager_data.activity_status).toEqual("completed");
  });

  test("submit commit activity manager", async () => {
    const engine = new Engine(...settings.persist_options);
    await engine.saveWorkflow("notify_and_user", "notify_and_user", blueprints_.notify_and_user_task);

    const activity_managers = [];
    engine.setActivityManagerNotifier((activityManager) => activity_managers.push(activityManager));

    let process = await engine.createProcessByWorkflowName("notify_and_user", actors_.simpleton);

    process = await engine.runProcess(process.id);

    expect(activity_managers).toHaveLength(2);
    const commit_activity_manager = activity_managers[1];
    expect(commit_activity_manager._type).toEqual("commit");

    const external_input = {
      textParamTwo: "exampleData"
    };

    const submit_result = await engine.submitActivity(commit_activity_manager._id, actors_.simpleton, external_input);
    expect(submit_result).toBeDefined();
    expect(submit_result.error).toBeUndefined();
    expect(submit_result.processPromise).toBeInstanceOf(Promise);
    process = await submit_result.processPromise;
    expect(process.state.status).toEqual(ProcessStatus.FINISHED);

    const activity_manager_data = await engine.fetchActivityManager(commit_activity_manager._id, actors_.simpleton);
    expect(activity_manager_data.activity_status).toEqual("completed");
  });

  test("submit do not continue if process on another step", async () => {
    const engine = new Engine(...settings.persist_options);
    await engine.saveWorkflow("user_user", "user_user", blueprints_.user_task_user_task);;
    
    const activity_managers = [];
    engine.setActivityManagerNotifier((activityManager) => activity_managers.push(activityManager));

    let process = await engine.createProcessByWorkflowName("user_user", actors_.simpleton);
    const process_id = process.id;
    process = await engine.runProcess(process_id, actors_.simpleton);

    expect(activity_managers).toHaveLength(1);
    await engine.runProcess(process_id, actors_.simpleton, {});
    expect(activity_managers).toHaveLength(2);

    const submit_result = await engine.submitActivity(activity_managers[0]._id, actors_.simpleton, {});
    expect(submit_result).toBeDefined();
    expect(submit_result.error).toBeUndefined();
    expect(submit_result.processPromise).toBeInstanceOf(Promise);
    process = await submit_result.processPromise;
    expect(process.state.status).toEqual(ProcessStatus.WAITING);
    expect(process.state.step_number).toEqual(5);
    expect(process.state.node_id).toEqual("3");
    expect(process.state.next_node_id).toEqual("3");

    process = await engine.fetchProcess(process_id);
    expect(process.state.status).toEqual(ProcessStatus.WAITING);
    expect(process.state.step_number).toEqual(5);
    expect(process.state.node_id).toEqual("3");
    expect(process.state.next_node_id).toEqual("3");
  });

  test("Throws commitActivity errorType", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    const { error } = await engine.submitActivity(activity_manager.id, actors_.simpleton, "Wrong external_input parameter");
    expect(error).toBeDefined();
    expect(error.errorType).toEqual("commitActivity");
    expect(error.message).toContain("invalid input syntax for type json");
  });

  test("Throws submitActivityUnknownError errorType", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    const activity_data = { userInput: "example user input" };
    const wrong_activity_manager_id = 123456;
    const { error } = await engine.submitActivity(wrong_activity_manager_id, actors_.simpleton, activity_data);
    expect(error).toBeDefined();
    expect(error.errorType).toEqual("submitActivityUnknownError");
    expect(error.message).toContain("invalid input syntax for type uuid");
  });

  test("Throws activityManager errorType", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task", "user_task", blueprints_.identity_user_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);
    let activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton);
    expect(activity_manager.id).toBeDefined();

    const activity_data = { userInput: "example user input" };
    await engine.submitActivity(activity_manager.id, actors_.simpleton, activity_data);

    const { error } = await engine.submitActivity(activity_manager.id, actors_.simpleton, activity_data);
    expect(error).toBeDefined();
    expect(error.errorType).toEqual("submitActivity");
    expect(error.message).toEqual("Submit activity unavailable");
  });
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  const timer_persist = persistor.getPersistInstance("Timer");
  
  await activity_persist.deleteAll();
  await sleep(10);
  await activity_manager_persist.deleteAll();
  await sleep(10);
  await process_persist.deleteAll();
  await sleep(10);
  await workflow_persist.deleteAll();
  await sleep(10);
  await timer_persist.deleteAll();
  if (settings.persist_options[0] === "knex"){
    await Process.getPersist()._db.delete()
                              .from("packages")
                              .where("name", "sample");
  };
};
