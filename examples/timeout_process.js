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
        timeout: 10,
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "userTask",
      name: "User Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        action: 'some_action',
        input: {},
      }
    },
    {
      id: "3",
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
  emitter.emit("===  RUNNING timer_task_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("timeout_process", "showcase expired process", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
};

run_example()
  .then(res => { emitter.emit(res); })
  .catch(e);
