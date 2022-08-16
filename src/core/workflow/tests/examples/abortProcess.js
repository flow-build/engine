const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    buildStartNode({ next: "2" }),
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
