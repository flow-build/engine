const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "99",
      lane_id: "1"
    },
    {
      id: "2",
      type: "Start",
      name: "Start node for admin",
      parameters: {
        input_schema: {},
      },
      next: "99",
      lane_id: "2",
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
      name: "simpleton",
      rule: lisp.validate_claim("simpleton"),
    },
    {
      id: "2",
      name: "admin",
      rule: lisp.validate_claim("admin"),
    },
  ],
  environment: {},
};

const simpleton_actor_data = {
  id: "1",
  claims: ["simpleton"]
};

const admin_actor_data = {
  id: "2",
  claims: ["admin"]
};

startLogger(emitter);

const run_example = async() => {
  emitter.emit("===  RUNNING multiple_start_example  ===");
  const engine = new Engine(...settings.persist_options);
  
  engine.setProcessStateNotifier((process_state) => emitter.emit(process_state));
  
  emitter.emit("===  simpleton start  ===");
  const workflow = await engine.saveWorkflow("multiple_start", "multiple_start", blueprint_spec);
  const simpleton_process = await engine.createProcess(workflow.id, simpleton_actor_data);
  await engine.runProcess(simpleton_process.id, simpleton_actor_data);
  
  emitter.emit("===  admin start  ===");
  const admin_process = await engine.createProcess(workflow.id, admin_actor_data);
  await engine.runProcess(admin_process.id, admin_actor_data);
};

run_example();
