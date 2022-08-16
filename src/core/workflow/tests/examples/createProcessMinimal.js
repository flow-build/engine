const { lanes } = require("./lanes");

module.exports = {
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
      lane_id: "true",
    },
    {
      id: "2",
      type: "SystemTask",
      category: "startProcess",
      name: "Start process node",
      parameters: {
        workflow_name: "minimal",
        input: {},
        actor_data: { $ref: "actor_data" },
      },
      next: "3",
      lane_id: "true",
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
