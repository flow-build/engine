const _ = require("lodash");

const baseSpec = {
  id: "SCRIPT-TASK",
  type: "ScriptTask",
  name: "create values for bag",
  next: "END",
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
};

const buildScriptTaskNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildScriptTaskNode;
