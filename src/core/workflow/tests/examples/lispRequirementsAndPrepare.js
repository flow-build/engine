const { lanes } = require("./lanes");
const finishNode = require("./nodeSpecs/finishNode");
const buildScriptTaskNode = require("./nodeSpecs/scriptTaskNode");
const buildSetToBagNode = require("./nodeSpecs/setToBagnode");
const buildStartNode = require("./nodeSpecs/startNode");
const buildUserTaskNode = require("./nodeSpecs/userTaskNode");

module.exports = {
  requirements: ["core", "test_package"],
  environment: {},
  prepare: ["do", ["def", "test_function", ["fn", ["&", "args"], { new_bag: "New Bag" }]], null],
  nodes: [
    buildStartNode({ next: "2" }),
    buildScriptTaskNode({
      id: "2",
      next: "3",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_function",
        },
      },
    }),
    buildSetToBagNode({
      id: "3",
      next: "4",
      parameters: {
        input: {
          new_bag: { $ref: "result.new_bag" },
        },
      },
    }),
    buildUserTaskNode({
      id: "4",
      next: "5",
      parameters: {
        input: {
          new_bag: { $ref: "bag.new_bag" },
        },
      },
    }),
    buildScriptTaskNode({
      id: "5",
      next: "6",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_2_js",
          type: "js",
        },
      },
    }),
    buildSetToBagNode({ id: "6" }),
    finishNode,
  ],
  lanes,
};
