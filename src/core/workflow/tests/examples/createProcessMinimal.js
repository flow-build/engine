const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildStartProcessNode = require("./nodeSpecs/startProcessNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [buildStartNode({ next: "START-PROCESS" }), buildStartProcessNode(), finishNode],
  lanes,
  environment: {},
};
