const _ = require("lodash");
const uuid = require("uuid/v1");
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
    await Process.getPersist()._db.destroy();;
  }
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
    expect(response).toHaveLength(0);
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
    expect(response).toHaveLength(0);
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
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    response = await engine.pushActivity(process.id, actors_.simpleton);
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
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

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
    response = await engine.pushActivity(process_id_1, actors_.simpleton);

    response = await engine.fetchAvailableActivitiesForActor(actors_.admin);
    activity_manager_id = response[0].id;
    await engine.commitActivity(process_id_2, actors_.admin, external_input);
    response = await engine.pushActivity(process_id_2, actors_.admin);

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton);
    expect(response).toHaveLength(1);
    response = await engine.fetchDoneActivitiesForActor(actors_.admin);
    expect(response).toHaveLength(2);
  });

  test("fetchDoneActivitiesForActor works with workflow_id filters", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    let response = await engine.fetchAvailableActivitiesForActor(actors_.simpleton);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    response = await engine.pushActivity(process.id, actors_.simpleton);
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

    response = await engine.pushActivity(process.id, actors_.simpleton);
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

    response = await engine.pushActivity(process.id, actors_.simpleton);
    expect(response.state.status).toBe("finished");

    response = await engine.fetchDoneActivitiesForActor(actors_.simpleton, {any: "any"});
    expect(response).toHaveLength(1);
    expect(response[0].activity_status).toBe("completed");
  });
});

describe("fetchAvailableActivityForProcess works", () => {

  test("fetchAvailableActivityForProcess returns ActivityManager with started activities", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);
    const process_id = process.id;

    const external_input = {any: "external_input"};
    await engine.commitActivity(process_id, actors_.simpleton, external_input);

    response = await engine.fetchAvailableActivityForProcess(process_id, actors_.simpleton);
    expect(response.activities).toHaveLength(1);
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
});


describe("pushActivity works", () => {

  test("Engine.pushActivity leads Process to continue", async () => {
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task);
    const process = await createRunProcess(engine, workflow.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const external_input = {any: "external_input"};
    await engine.commitActivity(process.id, actors_.simpleton, external_input);

    response = await engine.pushActivity(process.id, actors_.simpleton);
    expect(response.state.status).toBe("finished");
  });
});

describe("fetch works", () => {
  test("acitivityManager fetch validates actor permission", async () => {
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
  })
});

describe("Deserialize convert activity_manager to correct type", () => {
  test("acitivityManager fetch deserialize to notify activity manager instance", async () => {
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

  test("acitivityManager fetch deserialize to activity manager instance", async () => {
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
})

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
