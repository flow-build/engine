const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");

const blueprint_spec = {
  requirements: [
    "core"
  ],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start Pizza 2 WF",
      next: "2",
      parameters: {
        input_schema: {}
      },
      lane_id: "1"
    },
    {
      id: "2",
      type: "SystemTask",
      name: "Take the order",
      category: "HTTP",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          status: "pending",
          qty: 1,
          flavors: [
            "portuguesa"
          ],
          comments: "comentarios"
        },
        request: {
          url: "https://5faabe16b5c645001602b152.mockapi.io/order",
          verb: "POST",
          headers: {
            ContentType: "application/json"
          }
        }
      },
      result_schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          qty: { type: "string" },
          status: { type: "string" },
          flavors: { type: "array" },
          comments: { type: "string" },
          createdAt: { type: "string", format: "date-time" }
        },
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "Save Order",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          order: {
            "$ref": "result.data"
          }
        }
      }
    },
    {
      id: "4",
      type: "Finish",
      name: "Finish",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "client lane",
      rule: [
        "fn",
        [
          "&",
          "args"
        ],
        true
      ]
    }
  ],
  environment: {}
};

const actor_data = {
  id: "1",
  claims: []
};

const run_example = async () => {
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
