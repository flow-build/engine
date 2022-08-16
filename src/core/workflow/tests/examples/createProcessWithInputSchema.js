const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildStartProcessNode = require("./nodeSpecs/startProcessNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    buildStartNode({ next: "RESTRICTED" }),
    buildStartProcessNode({ id: "RESTRICTED", parameters: { workflow_name: "restricted_schema" }, next: "END" }),
    finishNode,
  ],
  lanes,
  environment: {},
};
