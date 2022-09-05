const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const nodes = require("../../../core/workflow/nodes/index.js");
const { ProcessStatus } = require("../../../core/workflow/process_state");
class CustomSystemTaskNode extends nodes.SystemTaskNode {
  validate() {
    return CustomSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

class ExampleSystemTaskNode extends nodes.SystemTaskNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["example"],
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(ExampleSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return ExampleSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  custom: CustomSystemTaskNode,
  example: ExampleSystemTaskNode,
};
