const _ = require("lodash");
const { prepare } = require("../../utils/input");
const { UserTaskNode } = require("./userTask");

expect(UserTaskNode).toStrictEqual({})

class SignalUserTaskNode extends UserTaskNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["action", "input", "signal"],
          properties: {
            action: { type: "string" },
            signal: { type: "string" },
            input: { type: "object" },
            timeout: {
              oneOf: [{ type: "number" }, { type: "object" }],
            },
            channels: { type: "array" },
            encrypted_data: {
              type: "array",
              items: { type: "string" },
            },
            activity_schema: { type: "object" },
            activity_manager: { type: "string", enum: ["commit", "notify"] },
          },
        },
      },
    });
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
    SignalUserTaskNode,
};
