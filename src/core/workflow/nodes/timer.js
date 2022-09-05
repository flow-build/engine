const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { timeoutParse } = require("../../utils/node");
const { SystemTaskNode } = require("./systemTask");

class TimerSystemTaskNode extends SystemTaskNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["timeout"],
          properties: {
            timeout: {
              oneOf: [{ type: "object" }, { type: "number" }],
            },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(TimerSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return TimerSystemTaskNode.validate(this._spec);
  }

  // eslint-disable-next-line no-unused-vars
  async _run(execution_data = {}, lisp) {
    execution_data["timeout"] = timeoutParse(this._spec.parameters, execution_data);

    return [execution_data, ProcessStatus.PENDING];
  }
}

module.exports = {
  TimerSystemTaskNode,
};
