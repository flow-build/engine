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
      category: 'signal',
      parameters: {
        signal: "test_signal",
        input_schema: {},
      },
      next: "minimal_2",
      lane_id: "true",
    },
    {
      id: "minimal_2",
      type: "Finish",
      name: "Finish Node",
      next: null,
      lane_id: "true"
    },
  ],
  lanes,
};
