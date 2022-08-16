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
      category: "custom_fn",
      name: "System node name",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {},
      },
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
