const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { ParameterizedNode } = require("./parameterized");

const writeJsFunction = (function_name) => {
  return ["fn", ["&", "args"], ["js", ["str", ["`", function_name + "("], "args", ["`", ")"]]]];
};

class ScriptTaskNode extends ParameterizedNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["script"],
          properties: {
            script: {
              type: "object",
              required: ["function"],
              properties: {
                function: {
                  oneOf: [{ type: "string" }, { type: "array" }],
                },
                args: { type: "object" },
              },
            },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(ScriptTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
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
