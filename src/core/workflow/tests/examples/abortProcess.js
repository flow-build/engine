const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    buildStartNode({ next: "SYSTEM-TASK" }),
    buildSystemTaskNode({
      category: "abortProcess",
      parameters: {
        input: {
          $ref: "bag.process_list",
        },
      },
    }),
    finishNode,
  ],
  lanes,
  environment: {},
};
