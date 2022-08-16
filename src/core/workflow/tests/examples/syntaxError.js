const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildScriptTaskNode = require("./nodeSpecs/scriptTaskNode");
const buildStartNode = require("./nodeSpecs/startNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    buildStartNode({ next: "2" }),
    buildScriptTaskNode({
      id: "2",
      parameters: {
        input: {
          internal_key: { $ref: "bag.inexistant" },
        },
        script: {
          package: "core",
          function: ["fn", ["&", "args"], ["nth", "args", 0]],
        },
      },
    }),
    finishNode,
  ],
  lanes,
  environment: {},
};
