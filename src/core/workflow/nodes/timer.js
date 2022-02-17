const _ = require("lodash");
const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const { timeoutParse } = require("../../utils/node");
const { SystemTaskNode } = require("./systemTask");

class TimerSystemTaskNode extends SystemTaskNode {
  static get rules() {
    const parameters_rules = {
      parameters_has_timeout: [obju.hasField, "timeout"],
      parameters_timeout_has_valid_type: [obju.isFieldTypeIn, "timeout", ["undefined", "number", "object"]],
    };

    return {
      ...super.rules,
      parameters_nested_validations: [new Validator(parameters_rules), "parameters"],
    };
  }

  validate() {
    return TimerSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    execution_data["timeout"] = timeoutParse(this._spec.parameters, execution_data);

    return [execution_data, ProcessStatus.PENDING];
  }
}

module.exports = {
  TimerSystemTaskNode,
};
