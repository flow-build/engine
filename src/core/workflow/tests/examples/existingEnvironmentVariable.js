const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildHttpNode = require("./nodeSpecs/httpNode");
const buildStartNode = require("./nodeSpecs/startNode");

module.exports = {
  requirements: ["core"],
  environment: {
    path: "PATH",
  },
  prepare: [],
  nodes: [
    buildStartNode({ next: "env_2" }),
    buildHttpNode({
      id: "env_2",
      parameters: {
        request: { url: "{{environment.path}}" },
      },
    }),
    finishNode,
  ],
  lanes,
};
