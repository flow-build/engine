const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildUserTaskNode = require("./nodeSpecs/userTaskNode");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    buildStartNode({ next: "2" }),
    buildUserTaskNode({
      id: "2",
      next: "3",
      parameters: {
        action: "do something",
        activity_manager: "notify",
        input: {
          question: "Insert some input.",
        },
      },
    }),
    buildUserTaskNode({
      id: "3",
      next: "4",
      parameters: {
        action: "do something",
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
    buildUserTaskNode({
      id: "4",
      parameters: {
        action: "do one more thing",
      },
    }),
    finishNode,
  ],
  lanes,
};
