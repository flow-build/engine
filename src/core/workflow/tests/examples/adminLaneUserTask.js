const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildUserTaskNode = require("./nodeSpecs/userTaskNode");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({ next: "admin_identity_user_task_2", lane_id: "admin" }),
    buildUserTaskNode({
      id: "admin_identity_user_task_2",
      lane_id: "admin",
    }),
    finishNode,
  ],
  lanes,
};
