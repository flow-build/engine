const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Trigger } = require("../../../workflow/trigger");
const { PersistorProvider } = require("../../../persist/provider");
const { v1: uuid } = require("uuid");

beforeEach(async () => {
  await _clean();
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
    process_id: uuid()
  });
  const saved_trigger = await trigger.save();
  expect(saved_trigger.id).toBe(trigger.id);
});

test("getByProcessId works", async () => {
    const process_id = uuid()
    const trigger = new Trigger({
        input: {testKey: 'testValue'},
        signal: 'test_signal',
        actor_data: {actor: 'test_actor'},
        process_id: process_id
    });
    await trigger.save();
    const fetched_trigger = await Trigger.getPersist().getByProcessId(process_id);
    expect(fetched_trigger).toHaveLength(1);
    expect(fetched_trigger[0].id).toBe(trigger.id);
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const trigger_target_persist = persistor.getPersistInstance("TriggerTarget");
  const trigger_persist = persistor.getPersistInstance("Trigger");
  await trigger_target_persist.deleteAll();
  await trigger_persist.deleteAll();
};
