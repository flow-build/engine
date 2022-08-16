const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildScriptTaskNode = require("./nodeSpecs/scriptTaskNode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildSubprocessNode = require("./nodeSpecs/subProcessNode");
const buildSystemTaskNode = require("./nodeSpecs/systemTaskNode");

module.exports = {
  name: "pizzaTest",
  description: "desc",
  blueprint_spec: {
    requirements: ["core"],
    prepare: [],
    nodes: [
      buildStartNode({ next: "2" }),
      buildScriptTaskNode({ id: "2", next: "3" }),
      buildSystemTaskNode({
        id: "3",
        category: "SetToBag",
        next: "4",
        parameters: {
          input: {
            example: { $ref: "result.example" },
            valueResult: { $ref: "result.value" },
          },
        },
      }),
      buildSubprocessNode({ id: "4", next: "5" }),
      buildScriptTaskNode({
        id: "5",
        parameters: {
          input: {
            userInput: { $ref: "result.userInput" },
          },
          script: {
            function: [
              "fn",
              ["input", "&", "args"],
              ["println", ["`", "User input: "], ["get", "input", ["`", "userInput"]]],
            ],
          },
        },
      }),
      finishNode,
    ],
    lanes,
    environment: {},
  },
};
