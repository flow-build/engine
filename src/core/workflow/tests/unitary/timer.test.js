const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { Timer } = require("../../../workflow/timer");
const { PersistorProvider } = require("../../../persist/provider");
const { v1: uuid } = require("uuid");

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
  const timer = new Timer("Process", uuid(), Timer.timeoutFromNow(10), { foo: "bar" });
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
  const timers = _.map(timeouts, (t) => new Timer("Process", uuid(), Timer.timeoutFromNow(t), {}));

  for (const t of timers) await t.save();

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

test("fetch resource don't work on other resource types", async () => {
  const mock_id = uuid();
  let timer = new Timer("Mocker", mock_id, Timer.timeoutFromNow(10), {});

  await timer.save();
  timer._resource_id = uuid();

  await timer
    .fetchResource()
    .then((timer) => {
      expect(timer).toBeFalsy();
    })
    .catch((error) => {
      expect(error).toBeTruthy();
    });
});

test("run timer don't work on other resource types", async () => {
  const mock_id = uuid();
  let timer = new Timer("ActivityManager", mock_id, Timer.timeoutFromNow(10), {});

  await timer.save();
  timer._resource_id = uuid();

  await timer
    .run()
    .then((timer) => {
      expect(timer).toBeFalsy();
    })
    .catch((error) => {
      expect(error).toBeTruthy();
    });
});

test("deactivate works", async () => {
  const id = uuid();
  let timer = new Timer("ActivityManager", id, Timer.timeoutFromNow(1000), {});
  await timer.save();

  const newTimer = new Timer("ActivityManager", id, new Date(), {});
  await newTimer.retrieve();
  expect(newTimer.active).toBe(true);
  await newTimer.deactivate();

  const lastTimer = new Timer("ActivityManager", id, new Date(), {});
  await lastTimer.retrieve();
  expect(newTimer.active).toBe(true);
});

test("retrieve works", async () => {
  const id = uuid();
  let timer = new Timer("ActivityManager", id, Timer.timeoutFromNow(10), {});
  await timer.save();

  const newTimer = new Timer("ActivityManager", id, Timer.timeoutFromNow(100), {});
  await newTimer.retrieve();
  expect(newTimer._expires_at).toBeDefined();
});

test("updateExpiration works", async () => {
  const id = uuid();
  let timer = new Timer("ActivityManager", id, Timer.timeoutFromNow(10), {});
  await timer.save();

  const newExpiration = Timer.timeoutFromNow(1000);
  timer._expires_at = newExpiration;

  const newTimer = await timer.updateExpiration();
  expect(newTimer.expires_at).toEqual(newExpiration);
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const timer_persist = persistor.getPersistInstance("Timer");
  await timer_persist.deleteAll();
};
