const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { ParameterizedNode } = require("./parameterized");

class EventNode extends ParameterizedNode {
  static get schema() {
    let schema = _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
            type: "object",
            required: ["events"],
            properties: {
                events: { 
                  type: "array",
                  items: {
                    type: "object",
                    required: ["definition", "family", "category"],
                    properties: {
                      definition: { type: "string" },
                      family: { type: "string" },
                      category: { type: "string" },
                    }
                  } 
                },
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
    const validate = ajv.compile(EventNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return EventNode.validate(this._spec);
  }

  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.WAITING];
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
        events: parameters.events
      }
    }
    return {};
  }
}

module.exports = {
  EventNode,
};
