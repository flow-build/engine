const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "swd_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {
          type: "object",
          properties: {
            number: { type: "number" },
            name: { type: "string" },
          },
          required: ["number", "name"],
        },
      },
      next: "swd_2",
      lane_id: "true",
    },
    {
      id: "swd_2",
      type: "UserTask",
      name: "Identity user task",
      next: "end",
      lane_id: "true",
      parameters: {
        action: "do something",
        input: {
          start_data: { $ref: "result" },
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
