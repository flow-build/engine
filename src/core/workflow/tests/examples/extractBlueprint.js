const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  prepare: [],
  parameters: {
    _extract: true,
  },
  nodes: [
    {
      id: "START",
      type: "Start",
      name: "Start node",
      next: "CONFIG",
      lane_id: "true",
      parameters: {
        input_schema: {},
      },
    },
    {
      id: "CONFIG",
      name: "configuration",
      next: "TIMER-NODE",
      type: "systemTask",
      category: "setToBag",
      lane_id: "true",
      parameters: {
        input: {
          actor_id: {
            $ref: "actor_data.actor_id"
          }
        }
      }
    },
    {
      id: "TIMER-NODE",
      name: "timer node",
      next: "START_PROCESS_NODE",
      type: "systemTask",
      category: "timer",
      lane_id: "true",
      parameters: {
        input: {},
        timeout: 1
      }
    },
    {
      id: "START_PROCESS_NODE",
      name: "start proces",
      next: "USER TASK NODE",
      type: "systemTask",
      category: "startProcess",
      lane_id: "true",
      parameters: {
        input: {},
        workflow_name: "blueprint_spec_son",
        actor_data: {
          $ref: "actor_data"
        }
      }
    },
    {
      id: "USER TASK NODE",
      name: "user task node",
      next: "FLOW",
      type: "userTask",
      lane_id: "true",
      parameters: {
        input: {
          "some input": "user task input"
        },
        action: "SOME_ACTION"
      }
    },
    {
      id: "FLOW",
      name: "flow node",
      next: {
        true: "FINISH-SUCCESS",
        default: "FINISH-ERROR"
      },
      type: "flow",
      lane_id: "true",
      parameters: {
        input: {
          decision_key: {
            $ref: "bag.user_task_node.extracted"
          }
        }
      }
    },
    {
      id: "FINISH-SUCCESS",
      name: "Finish - success",
      next: null,
      type: "Finish",
      lane_id: "true"
    },
    {
      id: "FINISH-ERROR",
      name: "Finish - error",
      next: null,
      type: "Finish",
      lane_id: "true"
    },
  ],
  lanes,
  environment: {},
};
