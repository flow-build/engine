const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildScriptTaskNode = require("./nodeSpecs/scriptTaskNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  parameters: {
    param1: "one value",
    param2: "two value",
  },
  nodes: [
    buildStartNode({ next: "2" }),
    buildScriptTaskNode({ id: "2", next: "3" }),
    buildSystemTaskNode({
      id: "3",
      category: "SetToBag",
      parameters: {
        input: {
          example: { $ref: "result.example" },
          valueResult: { $ref: "result.value" },
          pvalues: { $ref: "parameters.param1" },
        },
      },
    }),
    finishNode,
  ],
  lanes,
  environment: {},
};
