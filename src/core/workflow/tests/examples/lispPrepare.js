const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  prepare: ["do", ["def", "test_function", ["fn", ["&", "args"], { result: "Prepare New Bag" }]], null],
  environment: {},
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
      name: "Script Task node",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_function",
        },
      },
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "SystemTask SetToBag node",
      next: "4",
      lane_id: "true",
      parameters: {
        input: {
          new_bag: { $ref: "result.result" },
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
};
