const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "START",
      type: "Start",
      name: "Start extract node process",
      next: "START-PROCESS-NODE",
      lane_id: "true",
      parameters: {
        input_schema: {},
      },
    },
    {
      id: "START-PROCESS-NODE",
      name: "start proces node",
      next: "USER-TASK-NODE",
      type: "systemTask",
      category: "startProcess",
      lane_id: "true",
      extract: "start_process_data",
      parameters: {
        input: {},
        workflow_name: "blueprint_spec_son",
        actor_data: {
          $ref: "actor_data"
        }
      }
    },
    {
      id: "USER-TASK-NODE",
      name: "user task",
      next: "FLOW",
      type: "userTask",
      lane_id: "true",
      extract: "activity",
      parameters: {
        input: {},
        action: "ACTION"
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
            $ref: "bag.activity.extracted"
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
