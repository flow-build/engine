const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { ParameterizedNode } = require("./parameterized");

class SystemTaskNode extends ParameterizedNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      required: ["id", "name", "next", "type", "lane_id", "parameters", "category"],
      properties: {
        next: { type: "string" },
        category: { type: "string" },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(SystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return SystemTaskNode.validate(this._spec);
  }

  // eslint-disable-next-line no-unused-vars
  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  SystemTaskNode,
};
