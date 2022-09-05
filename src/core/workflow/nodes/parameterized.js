const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { Node } = require("./node");

class ParameterizedNode extends Node {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        parameters: {
          type: "object",
          required: ["input"],
          properties: {
            input: { type: "object" },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(ParameterizedNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return ParameterizedNode.validate(this._spec);
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    return prepare(this._spec.parameters.input, {
      bag,
      result: input,
      actor_data,
      environment,
      parameters,
    });
  }
}

module.exports = { ParameterizedNode };
