const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { FinishNode } = require("./finish");

class TriggerFinishNode extends FinishNode {
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
                target_process_id: { type: ["string", "object"] },
            },
          },
      },
    });
    schema.required = ["id", "name", "next", "type", "lane_id", "parameters"];
    return schema;
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const validate = ajv.compile(TriggerFinishNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return TriggerFinishNode.validate(this._spec);
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    if (this._spec.parameters && this._spec.parameters.input) {
      const prepareParameters = {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      };
      const preparedInput = prepare(this._spec.parameters.input, prepareParameters);
      return {
        target_process_id: prepare(this._spec.parameters.target_process_id, prepareParameters),
        trigger_payload: { ...preparedInput },
        signal: prepare(this._spec.parameters.signal, prepareParameters)
      }
    }
    return {};
  }
}

module.exports = {
  TriggerFinishNode,
};
