const _ = require("lodash");
const lisp = require("../../../lisp");
const obju = require("../../../utils/object");
const settings = require("../../../../../settings/tests/settings");
const { AssertionError } = require("assert");
const { Timer } = require("../../../workflow/timer");
const { ProcessStatus } = require("../../../workflow/process_state");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_, actors_ } = require("./blueprint_samples");
const { v1: uuid } = require("uuid/v1");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = Timer.getPersist();
    await persist._db.destroy();
  }
});

test("constructor works", () => {
  const timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), {});
  expect(timer).toBeInstanceOf(Timer);
});

test("save works", async () => {
  const timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), {});
  const saved_timer = await timer.save();
  expect(saved_timer.id).toBe(timer.id);
});

test("save params works", async () => {
  const timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), {foo: "bar"});
  const saved_timer = await timer.save();
  expect(saved_timer.params.foo).toBe("bar");
});

test("fetch works", async () => {
  let timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), {});
  timer = await timer.save();
  const fetched_timer = await Timer.fetch(timer.id);
  expect(fetched_timer.id).toBe(timer.id);
});

test("fetchAllRead works)", async () => {
  const timeouts = [-100, -100, +100];
  const timers = _.map(timeouts, (t) =>
    new Timer("Process", uuid(), Timer.timeoutFromNow(t), {})
  )

  for (const t of timers)
    await t.save()

  const ready = await Timer.fetchAllReady();

  expect(ready.length).toBe(2);

});

test("delete works", async () => {
  let timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), {});
  timer = await timer.save();
  let fetched_timer = await Timer.fetch(timer.id);
  expect(fetched_timer.id).toBe(timer.id);
  await Timer.delete(timer.id);
  fetched_timer = await Timer.fetch(timer.id);
  expect(fetched_timer).toBeFalsy();
});

test("fetch resource works on Mock resource", async () => {
  const mock_id = uuid();
  let timer = new Timer("Mock", mock_id, Timer.timeoutFromNow(10), {});
  await timer.save();
  const mock_obj = await timer.fetchResource();
  expect(mock_id).toBe(mock_obj.id);
});

test("run works on mock", async () => {
  const mock_id = uuid();
  let timer = new Timer("Mock", mock_id, Timer.timeoutFromNow(10), {});
  await timer.save();
  await timer.run();
  const fetched_timer = await Timer.fetch(timer.id);
  expect(fetched_timer).toBeUndefined();
  // expect(fetched_timer.id).toBe(saved_timer.id);
  // expect(fetched_timer.active).toBeFalsy();
});



const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const timer_persist = persistor.getPersistInstance("Timer");
  await timer_persist.deleteAll();
};
