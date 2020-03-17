const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");

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
        input: {},
        script: {
          function: ["fn", ["bag", "in", "ex", "&", "args"],
               ["do",
                ["println", ["`", "AUTHORIZED TO USE LANE 2? "],
                 ["or", ["get", "bag", ["`", "is_authorized"]], false]],
                ["list", "in", "bag"]]]
        }
      },
    },
    {
      id: "3",
      type: "ScriptTask",
      name: "Scrip Task node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          function: ["fn", ["bag", "in", "ex", "&", "args"],
               ["let", ["key", ["get", "args", 0], "value", ["get", "args", 1]],
                ["list",
                 null,
                 ["set", "bag", "key", "value"]]]],
          args: [["`", "is_authorized"], true]
        }
      }
    },
    {
      id: "4",
      type: "ScriptTask",
      name: "Script Task node",
      next: "5",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          function: ["fn", ["bag", "in", "ex", "&", "args"],
               ["do",
                ["println", ["`", "AUTHORIZED TO USE LANE 2? "],
                 ["or", ["get", "bag", ["`", "is_authorized"]], false]],
                ["list", "in", "bag"]]]
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
      rule: ["fn", ["actor_data", "bag"], ["contains?", "bag", ["`", "is_authorized"]]]
    }
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: []
};

const run_example = async() => {
  console.log("===  RUNNING latched_lane_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("latched lane_example", "latched lane showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_example().then(res => { console.log(res); });
