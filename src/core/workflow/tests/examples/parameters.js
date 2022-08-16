const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  prepare: [],
  parameters: {
    param1: "one value",
    param2: "two value",
  },
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
      type: "ScriptTask",
      name: "Create values for bag",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {},
        script: {
          package: "",
          function: [
            "fn",
            ["&", "args"],
            {
              example: "bag_example",
              value: "bag_value",
            },
          ],
        },
      },
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set values on bag",
      next: "4",
      lane_id: "true",
      parameters: {
        input: {
          example: { $ref: "result.example" },
          valueResult: { $ref: "result.value" },
          pvalues: { $ref: "parameters.param1" },
        },
      },
    },
    {
      id: "4",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
