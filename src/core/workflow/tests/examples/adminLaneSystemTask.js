const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "aist_1",
      type: "Start",
      name: "Start admin_identity_system_task",
      parameters: {
        input_schema: {},
      },
      next: "aist_2",
      lane_id: "admin",
    },
    {
      id: "aist_2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "end",
      lane_id: "admin",
      parameters: {
        input: {},
      },
    },
    {
      id: "end",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
