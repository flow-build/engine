const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const ajvValidator = require("../../utils/ajvValidator");
const emitter = require("../../utils/emitter");
const { timeoutParse } = require("../../utils/node");
const { Node } = require("./node");

class StartNode extends Node {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["input_schema"],
          properties: {
            input_schema: { type: "object" },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(StartNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
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
