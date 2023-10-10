const settings = require("../../../../settings/tests/settings");
const { PersistorProvider } = require("../../../core/persist/provider");
const { Process } = require("../../../core/workflow/process");
const { processHeartBeat } = require("../process");
const { timerHeartBeat } = require("../timer");
const { engineHeartBeat, getBeatInstances } = require("../base");

jest.mock("../process", () => {
  const actualModule = jest.requireActual("../process");
  return {
    ...actualModule,
    processHeartBeat: jest.spyOn(actualModule, "processHeartBeat"),
  };
});

jest.mock("../timer", () => {
  const actualModule = jest.requireActual("../timer");
  return {
    ...actualModule,
    timerHeartBeat: jest.spyOn(actualModule, "timerHeartBeat"),
  };
});

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    await Process.getPersist()._db.destroy();
  }
});

test("engineHeartBeat runs only for TIMER when current_instance=TIMER", async () => {
  const minimalEngine = {
    current_instance: 'TIMER',
  }
  await engineHeartBeat(minimalEngine);

  expect(timerHeartBeat).toHaveBeenCalled();
  expect(processHeartBeat).not.toHaveBeenCalled();
});

test("engineHeartBeat runs only for PROCESS when current_instance=PROCESS", async () => {
  const minimalEngine = {
    current_instance: 'PROCESS',
  }
  await engineHeartBeat(minimalEngine);

  expect(processHeartBeat).toHaveBeenCalled();
  expect(timerHeartBeat).not.toHaveBeenCalled();
});

test("engineHeartBeat runs for both TIMER and PROCESS when beat_instances length is 2", async () => {
  const minimalEngine = {
    current_instance: 'TIMER',
    beat_instances: ['TIMER' , 'PROCESS'],
  }

  await engineHeartBeat(minimalEngine);
  await engineHeartBeat(minimalEngine);

  expect(processHeartBeat).toHaveBeenCalled();
  expect(timerHeartBeat).toHaveBeenCalled();
});

test("getBeatInstances runs for TIMER_BATCH = 10", async () => {
  process.env.TIMER_BATCH = 10;

  const beatInstances = getBeatInstances();

  expect(beatInstances).toHaveLength(1);
  process.env.TIMER_BATCH = 0;
});

test("getBeatInstances runs for PROCESS_BATCH = 10", async () => {
  process.env.PROCESS_BATCH = 10;

  const beatInstances = getBeatInstances();

  expect(beatInstances).toHaveLength(1);
  process.env.PROCESS_BATCH = 0;
});

test("getBeatInstances runs for TIMER_BATCH = 10 and PROCESS_BATCH = 10", async () => {
  process.env.TIMER_BATCH = 10;
  process.env.PROCESS_BATCH = 10;

  const beatInstances = getBeatInstances();

  expect(beatInstances).toHaveLength(2);
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_state_persist = persistor.getPersistInstance("ProcessState");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  const timer_persist = persistor.getPersistInstance("Timer");

  await activity_persist.deleteAll();
  await activity_manager_persist.deleteAll();
  await process_state_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
  await timer_persist.deleteAll();
};