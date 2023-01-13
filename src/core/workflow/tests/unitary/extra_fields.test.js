require("dotenv").config();
const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Workflow } = require("../../../workflow/workflow");
const { ProcessStatus } = require("../../../workflow/process_state");
const { Process } = require("../../../workflow/process");
const { Engine } = require("../../../../engine/engine");
const { ActivityManager } = require("../../activity_manager");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_, actors_ } = require("./blueprint_samples");
const { v1: uuid } = require("uuid");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    await settings.persist_options[1].destroy();
  }
  Engine.kill();
});

describe("workflow with extra_fields", () => {
  test("save works", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    extra_fields.prioritize_mobile = true;
    const workflow = new Workflow("sample", "sample", blueprints_.minimal, null, extra_fields);
    const saved_workflow = await workflow.save();
    expect(saved_workflow.id).toBe(workflow.id);
    expect(saved_workflow._extra_fields.account_id).toBe(extra_fields.account_id);
  });

  test("fetch works", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    extra_fields.prioritize_mobile = true;
    let workflow = new Workflow("sample", "sample", blueprints_.minimal, null, extra_fields);
    workflow = await workflow.save();
    const fetched_workflow = await Workflow.fetch(workflow.id);
    expect(fetched_workflow.id).toBe(workflow.id);
    expect(fetched_workflow._extra_fields.account_id).toBe(extra_fields.account_id);
    expect(fetched_workflow._extra_fields.prioritize_mobile).toBe(true);
  });

  test("createProcess should create process", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    extra_fields.prioritize_mobile = true;
    let workflow = new Workflow("sample", "sample", blueprints_.admin_identity_system_task, null, extra_fields);
    workflow = await workflow.save();
    delete extra_fields.prioritize_mobile;
    const process = await workflow.createProcess({ ...actors_.admin, extra_fields }, { data: "value" });
    expect(process.id).toBeDefined();
    expect(process.status).toEqual(ProcessStatus.UNSTARTED);
    expect(process.state.step_number).toStrictEqual(1);
    expect(process.state.node_id).toStrictEqual(process.state.next_node_id);
    expect(process.state.bag).toStrictEqual({ data: "value" });
    expect(process.state.external_input).toStrictEqual({});
    expect(process.state.result).toStrictEqual({});
    expect(process.state.error).toBeNull();
    expect(process._extra_fields.account_id).toBe(workflow._extra_fields.account_id);
  });

  test("create process allowed start node admin", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    extra_fields.prioritize_mobile = true;
    let workflow = new Workflow("sample", "sample", blueprints_.multiple_starts, null, extra_fields);
    workflow = await workflow.save();
    delete extra_fields.prioritize_mobile;

    const actor_data = _.cloneDeep(actors_.admin);
    actor_data.claims = actor_data.claims.filter((claim) => claim === "admin");
    actor_data.extra_fields = extra_fields;

    const process = await workflow.createProcess(actor_data);
    expect(process.id).toBeDefined();
    expect(process.state.node_id).toEqual("10");
    expect(process._extra_fields.account_id).toBe(workflow._extra_fields.account_id);
  });

  test("createProcess validates user permission", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    extra_fields.prioritize_mobile = true;
    let workflow = new Workflow("sample", "sample", blueprints_.admin_identity_system_task, null, extra_fields);
    workflow = await workflow.save();
    delete extra_fields.prioritize_mobile;
    const process = await workflow.createProcess({ ...actors_.simpleton, extra_fields });
    expect(process.status).toBe(ProcessStatus.FORBIDDEN);
    expect(process.id).toBeUndefined();
    expect(process.state.status).toBe(ProcessStatus.FORBIDDEN);
  });
});

describe("process with extra_fields", () => {
  test("run condition with", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();

    process.env.engine_id = uuid();
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal, null, extra_fields);
    const actor_data = { ...actors_.simpleton, extra_fields };
    let workflow_process = await engine.createProcess(workflow.id, actor_data);
    const process_id = workflow_process.id;

    const db = Process.getPersist()._db;
    const persistor = PersistorProvider.getPersistor(...settings.persist_options);
    const process_persist = persistor.getPersistInstance("Process");
    await process_persist._db.transaction(async (trx) => {
      if (process.env.NODE_ENV === "sqlite") {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data }, db);
      } else {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data }, trx);
      }
    });

    const alternate_workflow_process = await engine.fetchProcess(process_id);
    await alternate_workflow_process.continue({}, actors_.simpleton);

    const transaction = process_persist._db.transaction(async (trx) => {
      if (process.env.NODE_ENV === "sqlite") {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data }, db);
      } else {
        await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data }, trx);
      }
    });
    await expect(transaction).rejects.toThrowError();

    const process_history = await engine.fetchProcessStateHistory(process_id);
    expect(process_history).toHaveLength(3);
    expect(process_history[1].actor_data.account_id).toBe(extra_fields.account_id);
  });
});

describe("activity_manager with extra_fields", () => {
  test("fetchAvailableActivitiesForActor works for single activity available", async () => {
    const extra_fields = {};
    extra_fields.account_id = uuid();
    const engine = new Engine(...settings.persist_options, {});
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task, null, extra_fields);
    const actor_data = { ...actors_.simpleton, extra_fields };
    const process = await createRunProcess(engine, workflow.id, actor_data);
    expect(process.status).toBe(ProcessStatus.WAITING);

    const response = await engine.fetchAvailableActivitiesForActor(actor_data);
    expect(response).toHaveLength(1);
  });

  test("activityManager fetch deserialize to activity manager instance", async () => {
    const engine = new Engine(...settings.persist_options, {});
    try {
      let activity_manager;
      engine.setActivityManagerNotifier((data) => (activity_manager = data));
      const extra_fields = {};
      extra_fields.account_id = uuid();
      const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_user_task, null, extra_fields);
      const actor_data = { ...actors_.simpleton, extra_fields };
      const process = await createRunProcess(engine, workflow.id, actor_data);
      expect(process.status).toBe(ProcessStatus.WAITING);

      expect(activity_manager).toBeDefined();
      let fetch_result = await engine.fetchActivityManager(activity_manager._id, actor_data);
      const deserialize_result = ActivityManager.deserialize(fetch_result);
      expect(deserialize_result).toBeDefined();
      expect(deserialize_result._extra_fields.account_id).toBe(extra_fields.account_id);
      expect(deserialize_result instanceof ActivityManager).toEqual(true);
    } finally {
      engine.setActivityManagerNotifier();
    }
  });
});

async function createRunProcess(engine, workflow_id, actor_data) {
  const process = await engine.createProcess(workflow_id, actor_data);
  return await engine.runProcess(process.id, actor_data);
}

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  const extra_fields_persist = persistor.getPersistInstance("ExtraFields");
  await extra_fields_persist.deleteAll();
  await activity_persist.deleteAll();
  await activity_manager_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
};