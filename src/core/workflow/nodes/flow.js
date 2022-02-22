const _ = require("lodash");
const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const { ParameterizedNode } = require("./parameterized");

class FlowNode extends ParameterizedNode {
  static get rules() {
    const input_rules = {
      input_has_one_key: [obju.hasManyKeys, "1"],
    };
    const next_rules = {
      next_has_default: [obju.hasField, "default"],
    };
    return {
      ...super.rules,
      next_has_valid_type: [obju.isFieldOfType, "next", "object"],
      next_nested_validations: [new Validator(next_rules), "next"],
      input_nested_validations: [new Validator(input_rules), "parameters.input"],
    };
  }

  validate() {
    return FlowNode.validate(this._spec);
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {}, parameters = {} }, lisp) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      return {
        node_id: this.id,
        bag: bag,
        external_input: external_input,
        result: input,
        error: null,
        status: ProcessStatus.RUNNING,
        next_node_id: this.next(execution_data),
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }

  next(execution_data) {
    const decision_key = Object.keys(this._spec.parameters.input)[0];
    const next_obj = this._spec.next;
    const next_key = _.get(execution_data, decision_key);
    if (_.has(next_obj, next_key)) {
      return this._spec.next[next_key];
    }
    return this._spec.next.default;
  }
}

module.exports = { FlowNode };
