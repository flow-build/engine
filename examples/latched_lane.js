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
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          is_authorized: { $ref: "bag.is_authorized" }
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "do",
              [
                "println",
                ["`", "AUTHORIZED TO USE LANE 2? "],
                ["or", ["get", "input", ["`", "is_authorized"]], ["`", "none"]]
              ]
            ]
          ]
        }
      },
    },
    {
      id: "3",
      type: "SystemTask",
      category: "setToBag",
      name: "set to bag node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          is_authorized: {$ref: "actor_data"}
        },
      }
    },
    {
      id: "4",
      type: "ScriptTask",
      name: "Script Task node",
      next: "5",
      lane_id: "1",
      parameters: {
        input: {
          is_authorized: { $ref: "bag.is_authorized" }
        },
        script: {
          function: ["fn", ["input", "&", "args"],
            ["do",
              ["println", ["`", "AUTHORIZED TO USE LANE 2? "],
                ["or", ["get", "input", ["`", "is_authorized"]], ["`", "none"]]],
              ]]
        }
      },
    },
    {
      id: "5",
      type: "UserTask",
      name: "Identity User Native Task node",
      next: "6",
      lane_id: "2",
      parameters: {
        action: "do something",
        input: {}
      }
    },
    {
      id: "6",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "2"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: lisp.return_true()
    },
    {
      id: "2",
      name: "restricted",
      rule: ["fn", ["actor_data", "bag"],
              ["=",
              ["get", ["get", "bag", ["`", "is_authorized"]],
                [
                  "`",
                  "id"
                ]
              ],
              ["get", "actor_data",
                [
                  "`",
                  "id"
                ]
              ]
            ]
          ]
    }
  ],
  environment: {},
};

const actor_data_1 = {
  id: "1",
  claims: ["simpleton"]
};

const actor_data_2 = {
  id: "2",
  claims: ["simpleton"]
};

startLogger(emitter);

const run_example = async() => {
  emitter.emit("===  RUNNING latched_lane_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("latched lane_example", "latched lane showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data_1);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data_1);

  let run_try = await engine.runProcess(process_id, actor_data_2, {});
  emitter.emit("\n Run try actor 2: ", run_try);
  run_try = await engine.runProcess(process_id, actor_data_1, {});
  emitter.emit("\n Run try actor 1: ", run_try);

  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_example().then(res => { emitter.emit(res); });
