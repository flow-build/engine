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
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {
          internal_key: { $ref: "bag.inexistant" },
        },
        script: {
          package: "core",
          function: ["fn", ["&", "args"], ["nth", "args", 0]],
        },
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
