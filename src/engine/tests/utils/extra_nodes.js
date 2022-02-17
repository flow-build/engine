const nodes = require("../../../core/workflow/nodes/index.js");
const { ProcessStatus } = require("../../../core/workflow/process_state");
const rules = require("../../../core/utils/object");
const { Validator } = require("../../../core/validators");

class CustomSystemTaskNode extends nodes.SystemTaskNode {
  static get rules() {
    return {
      ...super.rules,
    };
  }

  validate() {
    return CustomSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

class ExampleSystemTaskNode extends nodes.SystemTaskNode {
  static get rules() {
    const parameter_rules = {
      parameters_has_example: [rules.hasField, "example"],
    };
    return {
      ...super.rules,
      parameters_extra_validations: [new Validator(parameter_rules), "parameters"],
    };
  }

  validate() {
    return ExampleSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  custom: CustomSystemTaskNode,
  example: ExampleSystemTaskNode,
};
