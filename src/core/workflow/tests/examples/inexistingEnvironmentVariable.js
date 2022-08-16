const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildHttpNode = require("./nodeSpecs/httpNode");
const buildStartNode = require("./nodeSpecs/startNode");

module.exports = {
  requirements: ["core"],
  environment: {
    inexistent: "INEXISTENT",
  },
  prepare: [],
  nodes: [
    buildStartNode({ next: "inex_2" }),
    buildHttpNode({
      id: "inex_2",
      parameters: {
        request: {
          url: "{{environment.inexistent}}",
        },
      },
    }),
    finishNode,
  ],
  lanes,
};
