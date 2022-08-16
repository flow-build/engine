const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [buildStartNode({ id: "1", next: "2" }), buildSystemTaskNode({ id: "2", category: "custom_fn" }), finishNode],
  lanes,
  environment: {},
};
