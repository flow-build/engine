const _ = require("lodash");
const lisp = require("../../../lisp");
const obju = require("../../../utils/object");
const settings = require("../../../../../settings/tests/settings");
const { AssertionError } = require("assert");
const { Workflow } = require("../../../workflow/workflow");
const { ProcessStatus } = require("../../../workflow/process_state");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_, actors_ } = require("./blueprint_samples");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = Workflow.getPersist();
    await persist._db.destroy();
  }
});

test("constructor works", () => {
  const workflow = new Workflow("sample", "sample", blueprints_.minimal);
  expect(workflow).toBeInstanceOf(Workflow);
});

test("constructor fails for invalid blueprint spec", () => {
  const blueprint = _.cloneDeep(blueprints_.minimal);
  delete blueprint.nodes[0];
  const constructor_partial = () => { new Workflow("sample", "sample", blueprint); };
  expect(constructor_partial).toThrow(AssertionError);
});

test("save works", async () => {
  const workflow = new Workflow("sample", "sample", blueprints_.minimal);
  const saved_workflow = await workflow.save();
  expect(saved_workflow.id).toBe(workflow.id);
});

test("fetch works", async () => {
  let workflow = new Workflow("sample", "sample", blueprints_.minimal);
  workflow = await workflow.save();
  const fetched_workflow = await Workflow.fetch(workflow.id);
  expect(fetched_workflow.id).toBe(workflow.id);
});

test("delete works", async () => {
  let workflow = new Workflow("sample", "sample", blueprints_.minimal);
  workflow = await workflow.save();
  let fetched_workflow = await Workflow.fetch(workflow.id);
  expect(fetched_workflow.id).toBe(workflow.id);
  await Workflow.delete(workflow.id);
  fetched_workflow = await Workflow.fetch(workflow.id);
  expect(fetched_workflow).toBeFalsy();
});

describe("createProcess", () => {
  test("createProcess should create process", async () => {
    let workflow = new Workflow("sample", "sample", blueprints_.admin_identity_system_task);
    workflow = await workflow.save();
    const process = await workflow.createProcess(actors_.admin, { data: "value" });
    expect(process.id).toBeDefined();
    expect(process.status).toEqual(ProcessStatus.UNSTARTED);
    expect(process.state.step_number).toStrictEqual(1);
    expect(process.state.node_id).toStrictEqual(process.state.next_node_id);
    expect(process.state.bag).toStrictEqual({ data: "value" });
    expect(process.state.external_input).toStrictEqual({});
    expect(process.state.result).toStrictEqual({});
    expect(process.state.error).toBeNull();
  });

  test("create process allowed start node simpleton", async () => {
    let workflow = new Workflow("sample", "sample", blueprints_.multiple_starts);
    workflow = await workflow.save();
    const process = await workflow.createProcess(actors_.simpleton);
    expect(process.id).toBeDefined();
    expect(process.state.node_id).toEqual("1");
  });

  test("create process allowed start node admin", async () => {
    let workflow = new Workflow("sample", "sample", blueprints_.multiple_starts);
    workflow = await workflow.save();

    const actor_data = _.cloneDeep(actors_.admin);
    actor_data.claims = actor_data.claims.filter((claim) => claim === "admin");

    const process = await workflow.createProcess(actor_data);
    expect(process.id).toBeDefined();
    expect(process.state.node_id).toEqual("10");
  });

  test("createProcess validates user permission", async () => {
    let workflow = new Workflow("sample", "sample", blueprints_.admin_identity_system_task);
    workflow = await workflow.save();
    const process = await workflow.createProcess(actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.FORBIDDEN);
    expect(process.id).toBeUndefined();
    expect(process.state.status).toBe(ProcessStatus.FORBIDDEN);
  });

  test("create process on error if multiple start nodes avaliable", async () => {
    let workflow = new Workflow("sample", "sample", blueprints_.multiple_starts);
    workflow = await workflow.save();

    const process = await workflow.createProcess(actors_.admin);
    expect(process.status).toEqual(ProcessStatus.ERROR);
    expect(process.id).toBeUndefined();
    expect(process.state).toStrictEqual({ status: ProcessStatus.ERROR, error: "Multiple start nodes" });
  });

  test("process spec should contain evaluated environment", async () => {
    const original_node_env = process.env.NODE_ENV;
    const original_api_host = process.env.API_HOST;

    process.env.NODE_ENV = "invalid";
    process.env.API_HOST = "127.0.1.1";

    try {
      let workflow = new Workflow("sample", "sample", blueprints_.environment);
      workflow = await workflow.save();
      const process = await workflow.createProcess(actors_.simpleton);

      expect(process._blueprint_spec).toBeDefined();
      expect(process._blueprint_spec.environment).toBeDefined();
      expect(process._blueprint_spec.environment.node_env).toEqual("invalid");
      expect(process._blueprint_spec.environment.host).toEqual("127.0.1.1");
    } finally {
      process.env.NODE_ENV = original_node_env;
      process.env.API_HOST = original_api_host;
    }
  })
})

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const activity_persist = persistor.getPersistInstance("Activity");
  const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
  const process_persist = persistor.getPersistInstance("Process");
  const workflow_persist = persistor.getPersistInstance("Workflow");
  await activity_persist.deleteAll();
  await activity_manager_persist.deleteAll();
  await process_persist.deleteAll();
  await workflow_persist.deleteAll();
};
