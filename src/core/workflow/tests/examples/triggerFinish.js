const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  parameters: {
    signal: "test_signal"
  },
  nodes: [
    {
      id: "minimal_1",
      type: "Start",
      name: "Start minimal",
      parameters: {
        input_schema: {},
      },
      next: "minimal_2",
      lane_id: "true",
    },
    {
      id: "minimal_2",
      type: "Finish",
      name: "Finish Node",
      category: "signal",
      next: null,
      lane_id: "true",
      parameters: {
        input: {
          test_key: "test_value",
        },
        signal: "test_signal"
      }
    },
  ],
  lanes,
};
