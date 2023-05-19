const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "START-NODE-EXTRACT",
      type: "Start",
      name: "Start extract node process",
      next: "NODE-TO-START-PROCESS",
      lane_id: "true",
      parameters: {
        input_schema: {},
      },
    },
    {
      id: "NODE-TO-START-PROCESS",
      name: "node to start proces",
      next: "NODE-OF-USER-TASK",
      type: "systemTask",
      category: "startProcess",
      lane_id: "true",
      extract: "startProcessData",
      parameters: {
        input: {},
        workflow_name: "blueprint_spec_son",
        actor_data: {
          $ref: "actor_data"
        }
      }
    },
    {
      id: "NODE-OF-USER-TASK",
      name: "user task",
      next: "END",
      type: "userTask",
      lane_id: "true",
      extract: "activity",
      parameters: {
        input: {},
        action: "ACTION"
      }
    },
    {
      id: "END",
      name: "Finish",
      next: null,
      type: "Finish",
      lane_id: "true"
    }
  ],
  lanes,
  environment: {},
};
