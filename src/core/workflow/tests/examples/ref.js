const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "ref_1",
      type: "Start",
      name: "Start ref",
      parameters: {
        input_schema: {},
      },
      next: "ref_2",
      lane_id: "true",
    },
    {
      id: "ref_2",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set to bag ref",
      next: "end",
      lane_id: "true",
      parameters: {
        input: {
          process_id: { $ref: "parameters.process_id" },
          step_number: { $ref: "result.step_number" },
        },
      },
    },
    {
      id: "end",
      type: "Finish",
      name: "Finish Node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
