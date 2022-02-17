const _ = require("lodash");
const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const { ParameterizedNode } = require("./parameterized");

const writeJsFunction = (function_name) => {
  return ["fn", ["&", "args"], ["js", ["str", ["`", function_name + "("], "args", ["`", ")"]]]];
};

class ScriptTaskNode extends ParameterizedNode {
  static get rules() {
    const parameters_rules = {
      parameters_has_script: [obju.hasField, "script"],
      parameters_script_has_valid_type: [obju.isFieldOfType, "script", "object"],
    };
    const script_rules = {
      script_has_function: [obju.hasField, "function"],
      script_args_has_valid_type: [obju.isFieldTypeIn, "args", ["undefined", "object"]],
    };
    return {
      ...super.rules,
      next_has_valid_type: [obju.isFieldTypeIn, "next", ["string", "number"]],
      parameters_nested_validations: [new Validator(parameters_rules), "parameters"],
      script_nested_validations: [new Validator(script_rules), "parameters.script"],
    };
  }

  validate() {
    return ScriptTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    let result;
    try {
      const parameters = this._spec.parameters;
      let lisp_fn;
      if (parameters.script.type === "js") {
        lisp_fn = writeJsFunction(parameters.script.function);
      } else {
        lisp_fn = parameters.script.function;
      }
      const lisp_args = parameters.script.args || [];
      const all_args = [execution_data, ...lisp_args];
      result = lisp.evaluate([lisp_fn, ...all_args]);
    } catch (err) {
      throw new Error("Couldn't execute scripted function: " + err);
    }
    return [result, ProcessStatus.RUNNING];
  }
}

module.exports = {
  ScriptTaskNode,
};
