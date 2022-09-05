const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { ParameterizedNode } = require("./parameterized");

class FlowNode extends ParameterizedNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: {
          type: "object",
          required: ["default"],
          properties: {
            default: { type: "string" },
          },
        },
        parameters: {
          type: "object",
          maxProperties: 1,
          minProperties: 1,
          properties: {
            input: { type: "object" },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(FlowNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return FlowNode.validate(this._spec);
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {}, parameters = {} }) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      return {
        node_id: this.id,
        bag: bag,
        external_input: external_input,
        result: input,
        error: null,
        status: ProcessStatus.RUNNING,
        next_node_id: this.next(execution_data),
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }

  next(execution_data) {
    const decision_key = Object.keys(this._spec.parameters.input)[0];
    const next_obj = this._spec.next;
    const next_key = _.get(execution_data, decision_key);
    if (_.has(next_obj, next_key)) {
      return this._spec.next[next_key];
    }
    return this._spec.next.default;
  }
}

module.exports = { FlowNode };
