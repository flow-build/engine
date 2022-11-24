const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Engine } = require("../../../../engine/engine");
const { Trigger } = require("../../../workflow/trigger");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_, actors_ } = require("../../../../core/workflow/tests/unitary/blueprint_samples");

let engine, trigger_process;
beforeAll(async () => {
  engine = new Engine(...settings.persist_options);
  persistor = PersistorProvider.getPersistor(...settings.persist_options);
});

beforeEach(async () => {
  await _clean();
  const trigger_workflow = await engine.saveWorkflow(
    "trigger_workflow",
    "trigger_workflow",
    blueprints_.minimal
  );

  expect(trigger_workflow).toBeDefined()

  trigger_process = await engine.createProcessByWorkflowName("trigger_workflow", actors_.simpleton, {});
  trigger_process = await engine.runProcess(trigger_process.id);
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = Trigger.getPersist();
    await persist._db.destroy();
  }
});

test("constructor works", () => {
  const trigger = new Trigger({});
  expect(trigger).toBeInstanceOf(Trigger);
});

test("save works", async () => {
  const trigger = new Trigger({
    input: {testKey: 'testValue'},
    signal: 'test_signal',
    actor_data: {actor: 'test_actor'},
    process_id: trigger_process.id
  });
  const saved_trigger = await trigger.save();
  expect(saved_trigger).toBeDefined()
  expect(saved_trigger.id).toBe(trigger.id)
});

test("getByProcessId works", async () => {
    const trigger = new Trigger({
        input: {testKey: 'testValue'},
        signal: 'test_signal',
        actor_data: {actor: 'test_actor'},
        process_id: trigger_process.id
    });
    await trigger.save();

    const fetched_trigger = await Trigger.getPersist().getByProcessId(trigger_process.id);
    expect(fetched_trigger).toHaveLength(1);
    expect(fetched_trigger[0].id).toBe(trigger.id);
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const trigger_target_persist = persistor.getPersistInstance("TriggerTarget");
  const trigger_persist = persistor.getPersistInstance("Trigger");
  const target_persist = persistor.getPersistInstance("Target");
  
  const process_state_persist = persistor.getPersistInstance("ProcessState");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  
  await trigger_target_persist.deleteAll();
  await trigger_persist.deleteAll();
  await target_persist.deleteAll();

  await process_state_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
};
