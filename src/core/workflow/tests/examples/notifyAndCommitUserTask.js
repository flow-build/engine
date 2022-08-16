const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildUserTaskNode = require("./nodeSpecs/userTaskNode");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({
      next: "2",
    }),
    buildUserTaskNode({
      id: "2",
      next: "3",
      parameters: {
        activity_manager: "notify",
      },
    }),
    buildUserTaskNode({
      id: "3",
      parameters: {
        activity_schema: {
          type: "object",
          properties: {
            textParamTwo: {
              type: "string",
            },
          },
          required: ["textParamTwo"],
        },
      },
    }),
    finishNode,
  ],
  lanes,
};
