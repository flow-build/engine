const { v1: uuid } = require("uuid");
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");
const { ProcessState } = require("../../process_state");
const { Workflow } = require("../../workflow");
const { blueprints_ } = require("./blueprint_samples");

async function _clean() {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const processPersist = persistor.getPersistInstance("Process");
  const workflowPersist = persistor.getPersistInstance("Workflow");
  const processStatePersist = persistor.getPersistInstance("ProcessState");
  await processStatePersist.deleteAll();
  await processPersist.deleteAll();
  await workflowPersist.deleteAll();
}

let processId = uuid();
const exampleState = [
  {
    id: uuid(),
    created_at: new Date(),
    process_id: processId,
    step_number: 1,
    node_id: "3",
    bag: {},
    external_input: {},
    result: {},
    error: "",
    status: "running",
    next_node_id: "4",
    actor_data: {},
    time_elapsed: 12,
  },
  {
    id: uuid(),
    created_at: new Date(),
    process_id: processId,
    step_number: 2,
    node_id: "3",
    bag: {},
    external_input: {},
    result: {},
    error: "",
    status: "running",
    next_node_id: "5",
    actor_data: {},
    time_elapsed: 12,
  },
];

beforeAll(async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const processPersist = persistor.getPersistInstance("Process");
  const statePersist = persistor.getPersistInstance("ProcessState");

  const workflow = new Workflow("sample", "sample", blueprints_.minimal);
  const savedWorkflow = await workflow.save();

  let example_process = {
    id: processId,
    workflow_id: savedWorkflow.id,
    blueprint_spec: blueprints_.minimal,
    created_at: new Date(),
    state: {
      id: uuid(),
      process_id: processId,
      step_number: 9,
      node_id: "1",
      next_node_id: "2",
      bag: {},
      external_input: null,
      result: null,
      error: null,
      status: "running",
      created_at: new Date(),
    },
  };
  await processPersist.save(example_process);

  await statePersist.save(exampleState[0]);
  await statePersist.save(exampleState[1]);
});

afterAll(async () => {
  await _clean();
});

describe("Process State test", () => {
  test("fetch state by id should work", async () => {
    const state = await ProcessState.fetch(exampleState[0].id);
    expect(state).toBeDefined();
    expect(state._step_number).toBe(1);
  });

  test("fetch by processId + nodeId should work", async () => {
    const state = await ProcessState.fetchByNodeId(processId, "3");
    expect(state).toBeDefined();
    expect(state).toHaveLength(2);
  });

  test("fetch by processId + stepNumber should work", async () => {
    const state = await ProcessState.fetchByStepNumber(processId, 2);
    expect(state).toBeDefined();
    expect(state._next_node_id).toBe(exampleState[1].next_node_id);
  });
});
