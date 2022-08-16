const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
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
      type: "Flow",
      name: "Flow node",
      parameters: {
        input: {
          decision: { $ref: "bag.input" },
        },
      },
      next: {
        value: "98",
        default: "99",
      },
      lane_id: "true",
    },
    {
      id: "98",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
