const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "en_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "en_2",
      lane_id: "true",
    },
    {
      id: "en_2",
      type: "SystemTask",
      category: "custom",
      name: "Test System Task node",
      next: "en_3",
      lane_id: "true",
      parameters: {
        input: {},
      },
    },
    {
      id: "en_3",
      type: "SystemTask",
      category: "example",
      name: "Test User Task node",
      next: "end",
      lane_id: "true",
      parameters: {
        input: {},
        example: "data",
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
