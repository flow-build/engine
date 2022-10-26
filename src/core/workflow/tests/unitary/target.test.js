const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Target } = require("../../../workflow/target");
const { Trigger } = require("../../../workflow/trigger");
const { PersistorProvider } = require("../../../persist/provider");
const { v1: uuid } = require("uuid");

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
    const saved_target = await target.save();

    const process_id = uuid()
    const trigger = new Trigger({
        input: {testKey: 'testValue'},
        signal: 'test_signal',
        actor_data: {actor: 'test_actor'},
        process_id: process_id
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
  const target_persist = persistor.getPersistInstance("Target");
  const trigger_target_persist = persistor.getPersistInstance("TriggerTarget");
  await trigger_target_persist.deleteAll();
  await target_persist.deleteAll();
};
