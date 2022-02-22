const _ = require("lodash");
const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { ParameterizedNode } = require("./parameterized");

class SystemTaskNode extends ParameterizedNode {
  static get rules() {
    return {
      ...super.rules,
      next_has_valid_type: [obju.isFieldTypeIn, "next", ["string", "number"]],
    };
  }

  validate() {
    return SystemTaskNode.validate(this._spec);
  }

  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  SystemTaskNode,
};
