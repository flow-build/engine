const _ = require("lodash");
const obju = require("../../utils/object");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { Node } = require("./node");

class FinishNode extends Node {
  static get rules() {
    return {
      ...super.rules,
      next_is_null: [obju.fieldEquals, "next", null],
    };
  }

  validate() {
    return FinishNode.validate(this._spec);
  }

  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.FINISHED];
  }

  next(result = null) {
    return null;
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    if (this._spec.parameters && this._spec.parameters.input) {
      return prepare(this._spec.parameters.input, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
    }
    return {};
  }
}

module.exports = {
  FinishNode,
};
