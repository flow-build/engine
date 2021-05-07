const readlineSync = require("readline-sync");
const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startEventListener = require("../src/core/utils/eventEmitter");
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
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "UserTask",
      name: "User task node",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "userAction",
        input: {}
      }
    },
    {
      id: "3",
      type: "ScriptTask",
      name: "Print user input",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          userInput: {"$ref": "result.userInput"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "println",
              ["`", "User input: "],
              ["get", "input", ["`", "userInput"]],
            ],
          ],
        },
      },
    },
    {
      id: "4",
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

startEventListener(emitter);

const run_example = async() => {
  emitter.emit('info', "===  RUNNING user_task_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("user_task_example", "user task showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
  let state_history = await engine.fetchProcessStateHistory(process_id);
  emitter.emit('info', 'state_history', state_history);
  const external_input = readlineSync.question(
    "<Simulating external client resolution> Type something here\n");
  await engine.runProcess(process_id, actor_data, {userInput: external_input});
  state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_example().then(res => { emitter.emit('info', 'response', res); });
