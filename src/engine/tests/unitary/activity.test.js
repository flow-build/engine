const _ = require("lodash");
const { v1: uuid } = require("uuid");
const lisp = require("../../../core/lisp");
const settings = require("../../../../settings/tests/settings");
const { AssertionError } = require("assert");
const { Engine } = require("../../engine");
const { PersistorProvider } = require("../../../core/persist/provider");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const { Process } = require("../../../core/workflow/process");
const { Activity } = require("../../../core/workflow/activity");
const { ActivityManager, NotifyActivityManager } = require("../../../core/workflow/activity_manager");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex"){
    await Process.getPersist()._db.destroy();
  }
  Engine.kill();
});

async function createRunProcess(engine, workflow_id, actor_data) {
  const process = await engine.createProcess(workflow_id, actor_data);
  return await engine.runProcess(process.id, actor_data);
}

describe("fetchAvailableActivitiesForActor works", () => {

  test("fetchAvailableActivitiesForActor works for single activity available", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(1);
  });

  test("fetchAvailableActivitiesForActor works for no activity available", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.FINISHED);

    const response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(0);
  });

  test("fetchAvailableActivitiesForActor works when multiple activities are available", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process_1 = await createRunProcess(engine, workflow.id, actors_.simpleton);
    const process_2 = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process_1.status).toBe(ProcessStatus.WAITING);
    expect(process_2.status).toBe(ProcessStatus.WAITING);

    const response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(2);
  });

  test("fetchAvailableActivitiesForActor works with workflow_id filter", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process_1 = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process_1.status).toBe(ProcessStatus.WAITING);

    const response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton, {workflow_id: uuid()});
    expect(response).toHaveLength(1);
    expect(response[0].activity_status).toBe('started');
    expect(response[0].process_status).toBe(ProcessStatus.WAITING);
  });

  test("fetchAvailableActivitiesForActor works with status filter", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process_1 = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process_1.status).toBe(ProcessStatus.WAITING);

    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton,
      {workflow_id: workflow.workflow_id, status: "started"});
    expect(response).toHaveLength(1);
    response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton,
      {workflow_id: workflow.workflow_id, status: "invalid_status"});
    expect(response).toHaveLength(1);
  });

  test("fetchAvailableActivitiesForActor works with invalid filters", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process_1 = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process_1.status).toBe(ProcessStatus.WAITING);

    const response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton, {any: "any"});
    expect(response).toHaveLength(1);
  });

  test("fetchAvailableActivitiesForActor works when activity is available but lane does not allow actor", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.restricted_multilane_identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.admin);

    let response = await engine.fetchAvailableActivitiesForActor(actors_.admin);
    expect(response).toHaveLength(0);

    response = await engine.fetchAvailableActivitiesForActor(actors_.sys_admin);
    expect(response).toHaveLength(1);
  });
});

describe("fetchDoneActivitiesForActor works", () => {

  test("fetchDoneActivitiesForActor works when there are activities done", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const result = await engine.pushActivity(process.id, actors_.simpleton);
    expect(result.error).toBeUndefined();
    expect(result.processPromise).toBeInstanceOf(Promise);
    response = await result.processPromise;
    expect(response.state.status).toBe("finished");

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(1);
    expect(response[0].activity_status).toBe("completed");
  });

  test("fetchDoneActivitiesForActor works when there are no activities done", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(0);
  });

  test("fetchDoneActivitiesForActor works when multiple actors have done activities", async () => {
    const engine = new Engine(...settings.persist_options, {});
    let workflow = await engine.saveWorkflow("sample_1", "sample_1", blueprints_.identity_user_task);
    let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    const process_id_1 = process.id;

    workflow = await engine.saveWorkflow("sample_2", "sample_2", blueprints_.admin_identity_user_task);
    process = await createRunProcess(engine, workflow.id, actors_.admin);
    expect(process.status).toBe(ProcessStatus.WAITING);
    const process_id_2 = process.id;

    const external_input = {any: "external_input"};
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    let activity_manager_id = response[0].id;
    await engine.commitActivity(process_id_1, actors_.simpleton, external_input);
    let pushResult = await engine.pushActivity(process_id_1, actors_.simpleton);
    expect(pushResult.error).toBeUndefined();
    expect(pushResult.processPromise).toBeInstanceOf(Promise);
    response = await pushResult.processPromise;

    response = await engine.fetchAvailableActivitiesForActor(actors_.admin);
    activity_manager_id = response[0].id;
    await engine.commitActivity(process_id_2, actors_.admin, external_input);
    pushResult = await engine.pushActivity(process_id_2, actors_.admin);
    expect(pushResult.processPromise).toBeInstanceOf(Promise);
    expect(pushResult.error).toBeUndefined();
    response = await pushResult.processPromise;

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(1);
    response = await engine.fetchDoneActivitiesForActor(actors_.admin);
    expect(response).toHaveLength(2);

    response = await engine.fetchDoneActivitiesForActor(actors_.admin);
    expect(response[0].current_status).toBe(ProcessStatus.FINISHED);
    expect(response[1].current_status).toBe(ProcessStatus.FINISHED);

    filters = {
      current_status: ProcessStatus.UNSTARTED
    }
    response = await engine.fetchDoneActivitiesForActor(actors_.admin, filters);
    expect(response).toHaveLength(0);
  });

  test("fetchDoneActivitiesForActor works with workflow_id filters", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const pushResult = await engine.pushActivity(process.id, actors_.simpleton);
    expect(pushResult.processPromise).toBeInstanceOf(Promise);
    expect(pushResult.error).toBeUndefined();
    response = await pushResult.processPromise;
    expect(response.state.status).toBe("finished");

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton, {workflow_id: uuid()});
    expect(response).toHaveLength(0);
  });

  test("fetchDoneActivitiesForActor works with status filters", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const pushResult = await engine.pushActivity(process.id, actors_.simpleton);
    expect(pushResult.error).toBeUndefined();
    expect(pushResult.processPromise).toBeInstanceOf(Promise);
    response = await pushResult.processPromise;
    expect(response.state.status).toBe("finished");

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton,
      {workflow_id: workflow.id, status: "completed"});
    expect(response).toHaveLength(1);

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton,
      {workflow_id: workflow.id, status: "invalid status"});
    expect(response).toHaveLength(0);
  });

  test("fetchDoneActivitiesForActor works with invalid filters", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const pushResult = await engine.pushActivity(process.id, actors_.simpleton);
    expect(pushResult.error).toBeUndefined();
    expect(pushResult.processPromise).toBeInstanceOf(Promise);
    response = await pushResult.processPromise;
    expect(response.state.status).toBe("finished");

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton, {any: "any"});
    expect(response).toHaveLength(1);
    expect(response[0].activity_status).toBe("completed");
  });
});

describe("fetchAvailableActivityForProcess works", () => {
  test("fetchAvailableActivityForProcess returns only avaliable commit activity manager", async () => {
    const actor_data = actors_.simpleton;
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.notify_and_user_task);
    const process = await createRunProcess(engine, workflow.id, actor_data);
    expect(process.status).toBe(ProcessStatus.WAITING);
    const process_id = process.id;

    const activity_manager_data = await engine.fetchAvailableActivityForProcess(process_id, actor_data)
    expect(activity_manager_data).toBeDefined();
    expect(activity_manager_data.type).toEqual("commit");
  });

  test("fetchAvailableActivityForProcess returns ActivityManager with started activities", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    const process_id = process.id;

    const external_input = {any: "external_input"};
    await engine.commitActivity(process_id, actors_.simpleton, external_input);

    const response = await engine.fetchAvailableActivityForProcess(process_id, actors_.simpleton);
    expect(response.activities).toHaveLength(1);
  });

  test("fetchAvailableActivityForProcess returns undefined if no avaliable activity manager", async () => {
    const actor_data = actors_.simpleton;
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
    const process = await createRunProcess(engine, workflow.id, actor_data);
    expect(process.status).toBe(ProcessStatus.FINISHED);
    const process_id = process.id;

    const activity_manager_data = await engine.fetchAvailableActivityForProcess(process_id, actor_data)
    expect(activity_manager_data).toBeUndefined();
  });
});

describe("beginActivity works", () => {

  test("Engine.beginActivity returns correct data", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);

    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    response = await engine.beginActivity(process.id, actors_.simpleton);
    expect(response).toStrictEqual({question: "Insert some input."});
  });
});

describe("commitActivity works", () => {

  test("Engine.commitActivity creates Activity instance", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    const activity_manager_id = response[0].id;

    const external_input = {any: "external_input"};
    response = await engine.commitActivity(process.id, actors_.simpleton, external_input);
    expect(response.activities).toHaveLength(1);
  });

  test("Engine.commitActivity unshifts activity", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    const activity_manager_id = response[0].id;

    let external_input = {any: "first"};
    response = await engine.commitActivity(process.id, actors_.simpleton, external_input);
    expect(response.activities).toHaveLength(1);

    external_input = {any: "second"};
    response = await engine.commitActivity(process.id, actors_.simpleton, external_input);
    expect(response.activities[0].data.any).toEqual("second");
  });

  test("Engine.commitActivity shouldn't work for invalid actor ", async () => {
    const error = () => {throw Error("Error: No ActivityManager was found for process id")};
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.admin);
    expect(process.status).toBe(ProcessStatus.WAITING);

    let external_input = {any: "admin_external_input"};
    let response = await engine.commitActivity(process.id, actors_.admin, external_input);
    expect(response).toBeInstanceOf(ActivityManager);

    external_input = {any: "simpleton_external_input"};
    response = await engine.commitActivity(process.id, actors_.simpleton, external_input);
    expect(response.error).toBeDefined();
  });

  test("Engine.commitActivity encrypts data", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const crypto = engine.buildCrypto("", { key: "12345678901234567890123456789012" });
    engine.setCrypto(crypto);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_encrypt);
    let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);

    const user_input = "example user input"
    const response = await engine.commitActivity(process.id, actors_.simpleton, { value: user_input });
    expect(response.error).toBeUndefined();
    expect(response.activities).toHaveLength(1);
    expect(response.activities[0].data).toBeDefined();
    expect(response.activities[0].data.value).not.toEqual(user_input);

    const decrypted_value = crypto.decrypt(response.activities[0].data.value);
    expect(decrypted_value).toEqual(user_input);
  });

  test("Engine.commitActivity encrypts only encrypted_data if present", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const crypto = engine.buildCrypto("", { key: "12345678901234567890123456789012" });
    engine.setCrypto(crypto);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_encrypt);
    let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toEqual(ProcessStatus.WAITING);

    const user_input = "example user input"
    const response = await engine.commitActivity(process.id, actors_.simpleton, { other: user_input });
    expect(response.error).toBeUndefined();
    expect(response.activities).toHaveLength(1);
  });
});


describe("pushActivity works", () => {

  test("Engine.pushActivity leads Process to continue", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const response = await engine.pushActivity(process.id, actors_.simpleton);
    expect(response.error).toBeUndefined();
    expect(response.processPromise).toBeInstanceOf(Promise);
    let processState = await response.processPromise;
    expect(processState.state.status).toBe("finished");
  });

  test("Engine.pushActivity do not continue if process on another step", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    let process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    process = await engine.fetchProcess(process.id);
    await process.setState({
      bag: process.state.bag,
      result: {},
      next_node_id: process.state.next_node_id,
    });

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    const response = await engine.pushActivity(process.id, actors_.simpleton);
    expect(response.error).toBeUndefined();
    expect(response.processPromise).toBeInstanceOf(Promise);
    const process_response = await response.processPromise;
    expect(process_response.state.status).toBe(ProcessStatus.PENDING);
    expect(process_response.state.step_number).toBe(4);
  });
});

describe("fetch works", () => {
  test("activityManager fetch validates actor permission", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.admin);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.admin);
    
    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result).toBeUndefined();

    fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.admin);
    expect(fetch_result).toBeDefined();
  });

  test("entity returns all necessary fields to frontend", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    const fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);

    expect(fetch_result.id).toEqual(activity_manager.id);
    expect(fetch_result.process_id).toEqual(process.id);
    expect(fetch_result.workflow_name).toEqual("sample");
    expect(fetch_result.activity_status).toEqual("started");
  });

  test("returns undefined if unknow activity manager", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const fetch_result = await engine.fetchActivityManager(uuid(), actors_.simpleton);

    expect(fetch_result).toBeUndefined();
  });

  test("activityManager fetch return expires_at", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)
    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);

    expect(fetch_result.expires_at).toBeDefined();
  });
});

describe("Deserialize convert activity_manager to correct type", () => {
  test("activityManager fetch deserialize to notify activity manager instance", async () => {
    const engine = new Engine(...settings.persist_options, {});
    try {
      let activity_manager;
      engine.setActivityManagerNotifier((data) => activity_manager = data);
  
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.notify_user_task);
      const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
      expect(process.status).toBe(ProcessStatus.FINISHED);
  
      expect(activity_manager).toBeDefined();
      let fetch_result = await engine.fetchActivityManager(activity_manager._id, actors_.admin);
      const deserialize_result = ActivityManager.deserialize(fetch_result);
      expect(deserialize_result).toBeDefined();
      expect(deserialize_result instanceof NotifyActivityManager).toEqual(true);
    } finally {
      engine.setActivityManagerNotifier();
    }
  });

  test("activityManager fetch deserialize to activity manager instance", async () => {
    const engine = new Engine(...settings.persist_options, {});
    try {
      let activity_manager;
      engine.setActivityManagerNotifier((data) => activity_manager = data);
  
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
      const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
      expect(process.status).toBe(ProcessStatus.WAITING);
  
      expect(activity_manager).toBeDefined();
      let fetch_result = await engine.fetchActivityManager(activity_manager._id, actors_.admin);
      const deserialize_result = ActivityManager.deserialize(fetch_result);
      expect(deserialize_result).toBeDefined();
      expect(deserialize_result instanceof ActivityManager).toEqual(true);
    } finally {
      engine.setActivityManagerNotifier();
    }
  });

  test("activityManager fetch checks user permission", async () => {
    const engine = new Engine(...settings.persist_options, {});
    try {
      let activity_manager;
      engine.setActivityManagerNotifier((data) => activity_manager = data);
  
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.admin_identity_user_task);
      const process = await createRunProcess(engine, workflow.id, actors_.admin);
      expect(process.status).toBe(ProcessStatus.WAITING);
      
      expect(activity_manager).toBeDefined();
      let fetch_result = await engine.fetchActivityManager(activity_manager._id, actors_.simpleton);
      const deserialize_result = ActivityManager.deserialize(fetch_result);
      expect(deserialize_result).toBeUndefined();
    } finally {
      engine.setActivityManagerNotifier();
    }
  });

  test("activityManager addTimeInterval in seconds to expires_at", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();
    const first_date = fetch_result.expires_at;

    const seconds_interval = 120;
    await engine.addTimeInterval(activity_manager.id, seconds_interval, 'ActivityManager');

    fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();
    const second_date = fetch_result.expires_at;
    expect(parseInt((second_date - first_date)/1000)).toBe(seconds_interval);
  });

  test("activityManager addTimeInterval create new Timer when it doesn`t exist", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const activity_manager = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);
    expect(activity_manager).toHaveLength(1);

    let fetch_result = await engine.fetchActivityManager(activity_manager[0].id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeUndefined();

    const seconds_interval = 120;
    await engine.addTimeInterval(activity_manager[0].id, seconds_interval, 'ActivityManager');

    fetch_result = await engine.fetchActivityManager(activity_manager[0].id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const first_date = fetch_result.created_at;
    const second_date = fetch_result.expires_at;
    expect(parseInt((second_date - first_date)/1000)).toBe(seconds_interval);
  });

  test("activityManager addTimeInterval return error with no activity manager", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const seconds_interval = 120;
    fetch_result = await engine.addTimeInterval(uuid(), seconds_interval, 'ActivityManager');
    expect(fetch_result.error).toBeDefined();
    expect(fetch_result.error.errorType).toBe('activityManager');
    expect(fetch_result.error.message).toBe('Activity manager not found');
  });

  test("activityManager addTimeInterval return error with wrong time interval format", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const seconds_interval = '120';

    try {
      await engine.addTimeInterval(uuid(), seconds_interval, 'ActivityManager');

    } catch (resultError) {
      expect(resultError).toBeDefined();
      expect(resultError.message).toBe('data/date must be number, data/date must match format "dateTime", data/date must match exactly one schema in oneOf');
    }
  });

  test("activityManager addTimeInterval return error with wrong resource_type", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const seconds_interval = 120;
    try {
      await engine.addTimeInterval(uuid(), seconds_interval, 'activity manager');

    } catch (resultError) {
      expect(resultError).toBeDefined();
      expect(resultError.message).toBe('data/resource_type must be equal to one of the allowed values');
    }
  });

  test("activityManager set specific date to expires_at with setExpiredDate", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const future_date = '2022-05-13T00:00:00';
    await engine.setExpiredDate(activity_manager.id, future_date, 'ActivityManager');

    fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();
    expect(fetch_result.expires_at).toStrictEqual(new Date(future_date));
  });

  test("activityManager setExpiredDate return error with no activity manager", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const future_date = '2022-05-13T00:00:00';
    fetch_result = await engine.setExpiredDate(uuid(), future_date, 'ActivityManager');
    expect(fetch_result.error).toBeDefined();
    expect(fetch_result.error.errorType).toBe('activityManager');
    expect(fetch_result.error.message).toBe('Activity manager not found');
  });

  test("activityManager setExpiredDate return error with wrong date format", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const future_date = '2022-05-13';
    fetch_result = await engine.setExpiredDate(uuid(), future_date, 'ActivityManager');
    expect(fetch_result.error).toBeDefined();
    expect(fetch_result.error.errorType).toBe('activityManager');
    expect(fetch_result.error.message).toBe('Date should be in YYYY-MM-DDThh:mm:ss format');
  });

  test("activityManager setExpiredDate return error with wrong resource_type", async () => {
    const engine = new Engine(...settings.persist_options, {});

    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.user_timeout);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    await engine.runProcess(process.id);
    const activity_manager = await engine.fetchAvailableActivityForProcess(process.id, actors_.simpleton)

    let fetch_result = await engine.fetchActivityManager(activity_manager.id, actors_.simpleton);
    expect(fetch_result.expires_at).toBeDefined();

    const future_date = '2022-05-13T00:00:00';
    fetch_result = await engine.setExpiredDate(uuid(), future_date, 'activity manager');
    expect(fetch_result.error).toBeDefined();
    expect(fetch_result.error.errorType).toBe('activityManager');
    expect(fetch_result.error.message).toBe('Invalid resource_type');
  });
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  await activity_persist.deleteAll();
  await activity_manager_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
  if (settings.persist_options[0] === "knex"){
    await Process.getPersist()._db.delete()
                              .from("packages")
                              .where("name", "sample");
  };
};
