const obju = require("../../utils/object");
const { prepare } = require("../../utils/input");
const { Validator } = require("../../validators");
const { Node } = require("./node");

class ParameterizedNode extends Node {
  static get rules() {
    const parameters_rules = {
      parameters_has_input: [obju.hasField, "input"],
      input_has_valid_type: [obju.isFieldOfType, "input", "object"],
    };
    return {
      ...super.rules,
      has_parameters: [obju.hasField, "parameters"],
      parameters_has_valid_type: [obju.isFieldTypeIn, "parameters", ["object"]],
      parameters_input_validations: [new Validator(parameters_rules), "parameters"],
    };
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
