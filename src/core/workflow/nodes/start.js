const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const ajvValidator = require("../../utils/ajvValidator");
const emitter = require("../../utils/emitter");
const { timeoutParse } = require("../../utils/node");
const { Node } = require("./node");

class StartNode extends Node {
  static get rules() {
    const parameters_inpupt_schema_rules = {
      parameters_has_input_schema: [obju.hasField, "input_schema"],
      input_schema_has_valid_type: [obju.isFieldOfType, "input_schema", "object"],
    };
    return {
      ...super.rules,
      next_has_valid_type: [obju.isFieldTypeIn, "next", ["string", "number"]],
      has_parameters: [obju.hasField, "parameters"],
      parameters_has_valid_type: [obju.isFieldOfType, "parameters", "object"],
      parameters_input_schema_validations: [new Validator(parameters_inpupt_schema_rules), "parameters"],
    };
  }

  validate() {
    let [is_valid, error] = StartNode.validate(this._spec);
    if (is_valid) {
      try {
        let inputSchema = this._spec.parameters.input_schema;
        if (
          inputSchema.properties &&
          // eslint-disable-next-line no-prototype-builtins
          inputSchema.hasOwnProperty("additionalProperties") &&
          !inputSchema.additionalProperties
        ) {
          inputSchema.properties["parent_process_data"] = {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", format: "uuid" },
              expected_step_number: { type: "integer" },
            },
          };
        }
        ajvValidator.validateSchema(inputSchema);
      } catch (err) {
        is_valid = false;
        error = err.message;
      }
    }
    emitter.emit("NODE.START_VALIDATED", "START NODE VALIDATED", { is_valid: is_valid, error: error });
    return [is_valid, error];
  }

  _run(execution_data) {
    ajvValidator.validateData(this._spec.parameters.input_schema, execution_data.bag);
    let result = {
      timeout: timeoutParse(this._spec.parameters, execution_data),
    };
    return [result, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input }) {
    return { bag, input };
  }
}

module.exports = {
  StartNode: StartNode,
};
