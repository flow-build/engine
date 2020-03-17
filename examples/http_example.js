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
      type: "SystemTask",
      category: "SetToBag",
      name: "Set initial values to the bag",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          value: "casa"
        }
      },
    },
    {
      id: "3",
      type: "SystemTask",
      category: "HTTP",
      name: "Call endpoint",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          test: {
            $mustache: "value bag {{ bag.value }}"
          }
        },
        request: {
          verb: "POST",
          url: "https://webhook.site/c2f0b516-1855-4426-a484-58173347ad46",
          headers: {
            "ContentType": "application/json"
          },
        },
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

const run_example = async() => {
  console.log("===  RUNNING bag_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("bag_example", "bag showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_example().then(res => { console.log(res); });
