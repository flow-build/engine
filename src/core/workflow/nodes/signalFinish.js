const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { Node } = require("./node");

class SignalFinishNode extends Node {
  static get schema() {
    let schema = _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "null" },
        parameters: {
            type: "object",
            required: ["next_workflow_name"],
            properties: {
                next_workflow_name: { type: "string" },
            },
          },
      },
    });
    schema.required = ["id", "name", "next", "type", "lane_id", "parameters"];
    return schema;
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(SignalFinishNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return SignalFinishNode.validate(this._spec);
  }

  // eslint-disable-next-line no-unused-vars
  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.FINISHED];
  }

  next() {
    return null;
  }
}

module.exports = {
    SignalFinishNode,
};
