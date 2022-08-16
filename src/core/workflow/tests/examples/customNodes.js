const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({
      next: "en_2",
    }),
    buildSystemTaskNode({
      id: "en_2",
      category: "custom",
      next: "en_3",
    }),
    buildSystemTaskNode({
      id: "en_3",
      category: "example",
      parameters: {
        input: {},
        example: "data",
      },
    }),
    finishNode,
  ],
  lanes,
};
