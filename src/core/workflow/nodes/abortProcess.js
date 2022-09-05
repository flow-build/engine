const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const process_manager = require("../process_manager");
const { SystemTaskNode } = require("./systemTask");

class AbortProcessSystemTaskNode extends SystemTaskNode {
  static get schema() {
    const schema = _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          properties: {
            input: {
              oneOf: [{ type: "array", items: { type: "string", format: "uuid" } }, { type: "object" }],
            },
          },
        },
      },
    });
    schema.properties.parameters.properties.input = {
      oneOf: [{ type: "array", items: { type: "string", format: "uuid" } }, { type: "object" }],
    };
    return schema;
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(AbortProcessSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return AbortProcessSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data) {
    const abort_result = await process_manager.abortProcess(execution_data);
    const result = {};
    for (let index = 0; index < abort_result.length; index++) {
      result[execution_data[index]] = abort_result[index].status;
    }
    return [result, ProcessStatus.RUNNING];
  }
}

module.exports = {
  AbortProcessSystemTaskNode,
};
