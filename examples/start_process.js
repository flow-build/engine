const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "SystemTask",
      category: "startProcess",
      name: "start process node",
      parameters: {
        workflow_name: "minimal",
        input: {},
        actor_data: { $ref: "actor_data" },
      },
      next: "99",
      lane_id: "1"
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

const blueprint_minimal_spec = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: []
};

startLogger(emitter);

const run_example = async() => {
  emitter.emit("===  RUNNING start_process_example  ===");

  const logger = (data) => {
    emitter.emit(data);
  }

  const engine = new Engine(...settings.persist_options);
  engine.setProcessStateNotifier(logger);

  await engine.saveWorkflow("minimal", "minimal", blueprint_minimal_spec);
  const workflow = await engine.saveWorkflow("bag_example", "bag showcase", blueprint_spec);

  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
}

run_example();
