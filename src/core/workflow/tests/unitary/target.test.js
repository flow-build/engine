const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Engine } = require("../../../../engine/engine");
const { Target } = require("../../../workflow/target");
const { Trigger } = require("../../../workflow/trigger");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_, actors_ } = require("../../../../core/workflow/tests/unitary/blueprint_samples");
const { v1: uuid } = require("uuid");

let engine;
beforeAll(async () => {
  engine = new Engine(...settings.persist_options);
  persistor = PersistorProvider.getPersistor(...settings.persist_options);
});

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = Target.getPersist();
    await persist._db.destroy();
  }
});

test("constructor works", () => {
  const target = new Target({});
  expect(target).toBeInstanceOf(Target);
});

test("save works", async () => {
    const resource_id = uuid()
    const target = new Target({
        signal: 'test_signal',
        resource_type: 'workflow',
        resource_id: resource_id 
    });
    target._active = true;
    const saved_target = await target.save();
    expect(saved_target.id).toBe(target.id);
});

test("saveSignalRelation works", async () => {
    const resource_id = uuid()
    const target = new Target({
        signal: 'test_signal',
        resource_type: 'workflow',
        resource_id: resource_id 
    });
    target._active = true;
    const saved_target = await target.save();

    const trigger_workflow = await engine.saveWorkflow(
      "trigger_workflow",
      "trigger_workflow",
      blueprints_.minimal
    );
  
    expect(trigger_workflow).toBeDefined()
  
    let trigger_process = await engine.createProcessByWorkflowName("trigger_workflow", actors_.simpleton, {});
    trigger_process = await engine.runProcess(trigger_process.id);
    const trigger = new Trigger({
        input: {testKey: 'testValue'},
        signal: 'test_signal',
        actor_data: {actor: 'test_actor'},
        process_id: trigger_process.id
    });
    await trigger.save();

    const saved_trigger = await trigger.save();

    expect(saved_target.id).toBe(target.id);
    expect(saved_trigger.id).toBe(trigger.id);

    await Target.getPersist().saveSignalRelation(false, {
        trigger_id: saved_trigger.id,
        target_id: saved_target.id
    });

    const response = await Target.getPersist().getSignalRelation(false, saved_target.id)
    expect(response).toHaveLength(1);
    expect(response[0].target_id).toBe(target.id)
    expect(response[0].trigger_id).toBe(trigger.id)
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
