const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const { SystemTaskNode } = require("./systemTask");
const emitter = require("../../utils/emitter");
const { getEventNodeNotifier } = require("../../notifier_manager");

class EventNode extends SystemTaskNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      required: ["id", "name", "next", "type", "lane_id", "parameters"],
      properties: {
        next: { type: "string" },
        category: { type: "string" },
        parameters: {
          type: "object",
          properties: {
            family: { type: "string" },
            definition: { type: "string" },
            input: { type: "object" },
            key: { type: "string" },
          },
          required: ["family", "definition"]
        }
      },
    });
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

  // eslint-disable-next-line no-unused-vars
  _run(execution_data, lisp) {
    const event = this._spec.parameters

    try {
      const notifier = getEventNodeNotifier()
      if (notifier) {
        notifier({
          execution_data,
          event
        })
      }
    } catch (e) {
      emitter.emit('NODE.EVENT.ERROR', { e })
    }

    if (event) {
      if (this._spec.category === 'signal' && event.family === 'target') {
        return [execution_data, ProcessStatus.PENDING];
      }
    }
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  EventNode,
};
