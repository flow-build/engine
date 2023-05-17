const { v1: uuid } = require("uuid");
const { PersistorProvider } = require("../../../core/persist/provider");
const settings = require("../../../../settings/tests/settings");

const persistor = PersistorProvider.getPersistor(...settings.persist_options);
const activity_persist = persistor.getPersistInstance("Activity");
const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
const process_persist = persistor.getPersistInstance("Process");
const workflow_persist = persistor.getPersistInstance("Workflow");
const timer_persist = persistor.getPersistInstance("Timer");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function _clean() {
  await activity_persist.deleteAll();
  await sleep(10);
  await activity_manager_persist.deleteAll();
  await sleep(10);
  await process_persist.deleteAll();
  await sleep(10);
  await workflow_persist.deleteAll();
  await sleep(10);
  await timer_persist.deleteAll();
}

async function loadTimers() {
  let now = new Date();
  const timerReady = {
    id: "03d64feb-8215-452a-81e0-a92323c189ab",
    created_at: new Date(),
    expires_at: new Date(now.setDate(now.getDate() - 5)),
    active: true,
    resource_type: "Process",
    resource_id: uuid(),
    params: {},
    fired_at: null,
  };
  await timer_persist.save(timerReady);

  const timerActive = {
    id: "e2ac61ea-40b3-49f5-be0b-ce8d6f228625",
    created_at: new Date(),
    expires_at: new Date(now.setDate(now.getDate() + 10)),
    active: true,
    resource_type: "ActivityManager",
    resource_id: uuid(),
    params: {},
    fired_at: null,
  };
  await timer_persist.save(timerActive);
  return {
    ready: timerReady,
    active: timerActive,
  };
}

async function getTimer(id) {
  return await timer_persist.get(id);
}

async function saveTimer(timer) {
  return await timer_persist.save(timer);
}

function _validate_process_state_data(process_state_data, process_state) {
  expect(process_state_data.id).toBe(process_state.id);
  expect(process_state_data.step_number).toBe(process_state.step_number);
  expect(process_state_data.created_at).toMatchObject(process_state.created_at);
  expect(process_state_data.node_id).toBe(process_state.node_id);
  expect(process_state_data.status).toBe(process_state.status);
}

function _validate_workflow_data(workflow_data, workflow) {
  expect(workflow_data.id).toBe(workflow.id);
  expect(workflow_data.name).toBe(workflow.name);
  expect(workflow_data.description).toBe(workflow.description);
}

module.exports = {
  loadTimers,
  sleep,
  _clean,
  _validate_process_state_data,
  _validate_workflow_data,
  persistOptions: settings.persist_options,
  getTimer,
  saveTimer,
};
