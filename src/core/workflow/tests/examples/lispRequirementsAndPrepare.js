const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core", "test_package"],
  environment: {},
  prepare: ["do", ["def", "test_function", ["fn", ["&", "args"], { new_bag: "New Bag" }]], null],
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
          new_bag: { $ref: "result.new_bag" },
        },
      },
    },
    {
      id: "4",
      type: "UserTask",
      name: "User task",
      next: "5",
      lane_id: "true",
      parameters: {
        action: "do something",
        input: {
          new_bag: { $ref: "bag.new_bag" },
        },
      },
    },
    {
      id: "5",
      type: "ScriptTask",
      name: "Script Task node",
      next: "6",
      lane_id: "true",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_2_js",
          type: "js",
        },
      },
    },
    {
      id: "6",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag Task node",
      next: "7",
      lane_id: "true",
      parameters: {
        input: {
          new_bag: { $ref: "result.result" },
        },
      },
    },
    {
      id: "7",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
