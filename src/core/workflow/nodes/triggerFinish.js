const _ = require("lodash");
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
            },
          },
      },
    });
    schema.required = ["id", "name", "next", "type", "lane_id", "parameters"];
    return schema;
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    if (this._spec.parameters && this._spec.parameters.input) {
      const preparedInput = prepare(this._spec.parameters.input, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
      return {
        trigger_payload: { ...preparedInput },
        signal: parameters.signal
      }
    }
    return {};
  }
}

module.exports = {
  TriggerFinishNode,
};
