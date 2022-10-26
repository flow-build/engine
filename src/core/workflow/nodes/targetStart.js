const _ = require("lodash");
const { StartNode } = require("./start");

class TargetStartNode extends StartNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["input_schema", "signal"],
          properties: {
            signal: { type: "string"},
            input_schema: { type: "object" },
          },
        },
      },
    });
  }
}

module.exports = {
    TargetStartNode: TargetStartNode,
};
