const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { Node } = require("./node");

class TriggerFinishNode extends Node {
  static get schema() {
    let schema = _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "null" },
        parameters: {
            type: "object",
            required: ["signal"],
            properties: {
                signal: { type: "string" },
                input: { type: "object" },
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
    const validate = ajv.compile(TriggerFinishNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return TriggerFinishNode.validate(this._spec);
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
  TriggerFinishNode,
};
