const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildScriptTaskNode = require("./nodeSpecs/scriptTaskNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core", "test_package"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({ next: "2" }),
    buildScriptTaskNode({
      id: "2",
      next: "3",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_1",
        },
      },
    }),
    buildSystemTaskNode({
      id: "3",
      category: "SetToBag",
      parameters: {
        input: {
          new_bag: { $ref: "result.result" },
        },
      },
    }),
    finishNode,
  ],
  lanes,
};
