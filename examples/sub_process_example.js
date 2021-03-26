const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec_son = {
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
      name: "Create values for bag",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "",
          function: [
            "fn",
            ["&", "args"],
            {
              example: "bag_example",
              value: "bag_value",
            },
          ],
        },
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set values on bag",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          example: { "$ref": "result.example" },
          valueResult: { "$ref": "result.value" }
        }
      }
    },
    {
      id: "4",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1",
      parameters: {
        input: {
          string: {
            "$js": 'Math.random'
          }
        }
      }
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

const blueprint_spec_parent = {
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
      type: "SystemTask",
      category: "SetToBag",
      name: "Set values on bag",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          example: "any example",
          valueResult: "any result"
        }
      }
    },
    {
      id: "3",
      type: "SubProcess",
      name: "Sub Process base in User task node",
      next: "4",
      lane_id: "1",
      parameters: {
        actor_data: {
          id: "2",
          claims: []
        },
        input: {
          workflow_name: "sub_process_example_son_test",
          valid_response: "finished"
        }
      }
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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

startLogger(emitter);

const run_example = async () => {
  emitter.emit("===  RUNNING sub_process_example  ===");
  const engine = new Engine(...settings.persist_options);

  const workflow_parent = await engine.saveWorkflow("sub_process_example_parent", "sub process example showcase", blueprint_spec_parent);
  await engine.saveWorkflow("sub_process_example_son_test", "sub process example showcase", blueprint_spec_son);

  const process_parent = await engine.createProcess(workflow_parent.id, actor_data);
  await engine.runProcess(process_parent.id, actor_data);

  delay(3000);
  let parent_state_history = await engine.fetchProcessStateHistory(process_parent.id);
  return parent_state_history;
}

run_example().then(res => { emitter.emit(res); });