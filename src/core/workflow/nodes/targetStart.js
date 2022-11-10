const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
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

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(TargetStartNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }
}

module.exports = {
    TargetStartNode: TargetStartNode,
};
