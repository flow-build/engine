const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { Node } = require("./node");

class FinishNode extends Node {
  static get schema() {
    const schema = _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "null" },
      },
    });
    schema.required = ["id", "name", "next", "type", "lane_id"];
    return schema;
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(FinishNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return FinishNode.validate(this._spec);
  }

  _setBag(bag) {
    return bag;
  }

  // eslint-disable-next-line no-unused-vars
  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.FINISHED];
  }

  next() {
    return null;
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    if (this._spec.parameters && this._spec.parameters.input) {
      return prepare(this._spec.parameters.input, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
    }
    return {};
  }
}

module.exports = {
  FinishNode,
};
