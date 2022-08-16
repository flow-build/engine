const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({ next: "aist_2", lane_id: "admin" }),
    buildSystemTaskNode({
      id: "aist_2",
      category: "SetToBag",
      lane_id: "admin",
    }),
    finishNode,
  ],
  lanes,
};
