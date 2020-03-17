const _ = require("lodash");
const uuid = require("uuid/v1");
const settings = require("../../../../settings/tests/settings");
const { Workflow } = require("../../../core/workflow/workflow");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const { Cockpit } = require("../../cockpit");
const { Engine } = require("../../../engine/engine");
const { PersistorProvider } = require("../../../core/persist/provider");
const { blueprints_, actors_ } = require("../../../core/workflow/tests/unitary/blueprint_samples");
const extra_nodes = require("../../../engine/tests/utils/extra_nodes");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex"){
    await Workflow.getPersist()._db.destroy();;
  }
});

describe("getProcessStateHistory works", () => {

  test("getProcessStateHistory when there are states for the process", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let process = await engine.createProcess(workflow.id, actors_.simpleton);
    process = await engine.runProcess(process.id, actors_.simpleton);
    const process_state_history = await engine.fetchProcessStateHistory(process.id);
    const cockpit = new Cockpit(...settings.persist_options);
    const process_state_data_history = await cockpit.getProcessStateHistory(process.id);
    expect(process_state_data_history).toHaveLength(process_state_history.length);
    for (const process_state of process_state_history) {
      const process_state_data = _.find(process_state_data_history, {id: process_state.id});
      _validate_process_state_data(process_state_data, process_state);
    }
  });

  test("getProcessStateHistory works for no states", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let process = await engine.createProcess(workflow.id, actors_.admin);
    process = await engine.runProcess(process.id, actors_.admin);
    const cockpit = new Cockpit(...settings.persist_options);
    const process_state_data_history = await cockpit.getProcessStateHistory(uuid());
    expect(process_state_data_history).toHaveLength(0);
  });

  test("getProcessStateHistory works when there are many processes with states", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    let simpleton_process = await engine.createProcess(workflow.id, actors_.simpleton);
    simpleton_process = await engine.runProcess(simpleton_process.id, actors_.simpleton);
    let admin_process = await engine.createProcess(workflow.id, actors_.admin);
    admin_process = await engine.runProcess(admin_process.id, actors_.admin);
    const simpleton_process_state_history = await engine.fetchProcessStateHistory(simpleton_process.id);
    const admin_process_state_history = await engine.fetchProcessStateHistory(admin_process.id);
    const cockpit = new Cockpit(...settings.persist_options);
    const simpleton_process_state_data_history = await cockpit.getProcessStateHistory(simpleton_process.id);
    const admin_process_state_data_history = await cockpit.getProcessStateHistory(admin_process.id);
    expect(simpleton_process_state_data_history).toHaveLength(simpleton_process_state_history.length);
    expect(admin_process_state_data_history).toHaveLength(admin_process_state_history.length);
    for (const process_state of simpleton_process_state_history) {
      const process_state_data = _.find(simpleton_process_state_data_history, {id: process_state.id});
      _validate_process_state_data(process_state_data, process_state);
    }
    for (const process_state of admin_process_state_history) {
      const process_state_data = _.find(admin_process_state_data_history, {id: process_state.id});
      _validate_process_state_data(process_state_data, process_state);
    }
  });
});

describe("getWorkflowsForActor works", () => {

  test("getWorkflowsForActor when there are workflows available to actor", async () => {
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.identity_system_task);
    const cockpit = new Cockpit(...settings.persist_options);
    const actor_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(actor_workflows_data).toHaveLength(1);
    _validate_workflow_data(actor_workflows_data[0], workflow);
  });

  test("getWorkflowsForActor when there are no workflows available", async () => {
    const cockpit = new Cockpit(...settings.persist_options);
    const actor_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(actor_workflows_data).toHaveLength(0);
  });

  test("getWorkflowsForActor when there are workflows, but not all are available to actor", async () => {
    const engine = new Engine(...settings.persist_options);
    const open_workflow = await engine.saveWorkflow("open", "open", blueprints_.identity_system_task);
    const restricted_workflow = await engine.saveWorkflow("restricted", "restricted", blueprints_.restricted_multilane_identity_user_task);
    const cockpit = new Cockpit(...settings.persist_options);
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(simpleton_workflows_data).toHaveLength(1);
    _validate_workflow_data(simpleton_workflows_data[0], open_workflow);
    const admin_workflows_data = await cockpit.getWorkflowsForActor(actors_.admin);
    expect(admin_workflows_data).toHaveLength(2);
    const admin_open_workflow_data = _.find(admin_workflows_data, {name: "open"});
    const admin_restricted_workflow_data = _.find(admin_workflows_data, {name: "restricted"});
    _validate_workflow_data(admin_open_workflow_data, open_workflow);
    _validate_workflow_data(admin_restricted_workflow_data, restricted_workflow);
  });

  test("getWorkflowsForActor list workflows with multiple starts and only one start node is allowed", async () => {
    const engine = new Engine(...settings.persist_options);
    const open_workflow = await engine.saveWorkflow("multiple", "multiple", blueprints_.multiple_starts);
    const cockpit = new Cockpit(...settings.persist_options);
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.simpleton);
    expect(simpleton_workflows_data).toHaveLength(1);
    _validate_workflow_data(simpleton_workflows_data[0], open_workflow);
  });

  test("getWorkflowsForActor filters workflows with multiple starts and many start nodes are allowed", async () => {
    const engine = new Engine(...settings.persist_options);
    const open_workflow = await engine.saveWorkflow("multiple", "multiple", blueprints_.multiple_starts);
    const cockpit = new Cockpit(...settings.persist_options);
    const simpleton_workflows_data = await cockpit.getWorkflowsForActor(actors_.admin);
    expect(simpleton_workflows_data).toHaveLength(0);
  });
});

describe("Adding extra nodes works", () => {

  test("Validation of extra nodes works", async () => {
    const cockpit = new Cockpit(...settings.persist_options);
    cockpit.addCustomSystemCategory(extra_nodes);
    const custom_bluprint = _.cloneDeep(blueprints_.extra_nodes);
  const exampleNode = custom_bluprint.nodes.find((node) => node.category === 'example');
  delete exampleNode.parameters.example;
  await expect(cockpit.saveWorkflow("sample", "sample", custom_bluprint)).rejects.toThrowError("parameters_has_example");
  });

  test("Execution of extra nodes works", async () => {
    const cockpit = new Cockpit(...settings.persist_options);
    cockpit.addCustomSystemCategory(extra_nodes);
    const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.extra_nodes);
    let process = await cockpit.createProcess(workflow.id, actors_.simpleton);
    process = await cockpit.runProcess(process.id, actors_.simpleton);
    expect(process.status).toBe(ProcessStatus.FINISHED);
  });
});

test("fetchWorkflowsWithProcessStatusCount works", async () => {
  const cockpit = new Cockpit(...settings.persist_options);
  const workflow = await cockpit.saveWorkflow("sample", "sample", blueprints_.minimal);
  await cockpit.createProcess(workflow.id, actors_.simpleton);
  const process = await cockpit.createProcess(workflow.id, actors_.simpleton);
  await cockpit.runProcess(process.id, actors_.simpleton, {});

  let response = await cockpit.fetchWorkflowsWithProcessStatusCount(actors_.simpleton);
  expect(response.sample.unstarted).toBe(1);
  expect(response.sample.finished).toBe(1);
});

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

const _validate_task_data = (task, workflow, process_state) => {
  const blueprint_spec = workflow.blueprint_spec;
  const nodes_spec = blueprint_spec.nodes;
  const lanes_spec = blueprint_spec.lanes;
  const current_node_id = process_state.node_id;
  const current_node = _.find(nodes_spec, {id: current_node_id});
  const current_lane = _.find(lanes_spec, {id: current_node.lane_id});
  expect(task.workflow_name).toBe(workflow.name);
  expect(task.process_id).toBe(process_state.process_id);
  expect(task.process_status).toBe(process_state.status);
  expect(task.process_last_update).toMatchObject(process_state.created_at);
  expect(task.node_name).toBe(current_node.id);
  expect(task.lane_name).toBe(current_lane.name);
  expect(task.process_step_number).toBe(process_state.step_number);
};

const _validate_process_state_data = (process_state_data, process_state) => {
  expect(process_state_data.id).toBe(process_state.id);
  expect(process_state_data.step_number).toBe(process_state.step_number);
  expect(process_state_data.created_at).toMatchObject(process_state.created_at);
  expect(process_state_data.node_id).toBe(process_state.node_id);
  expect(process_state_data.status).toBe(process_state.status);
};

const _validate_workflow_data = (workflow_data, workflow) => {
  expect(workflow_data.id).toBe(workflow.id);
  expect(workflow_data.name).toBe(workflow.name);
  expect(workflow_data.description).toBe(workflow.description);
};
