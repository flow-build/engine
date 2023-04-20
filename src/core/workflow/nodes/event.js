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

  async run({ bag = {}, input = {}, external_input = null, actor_data = {}, environment = {}, parameters = {} }, lisp) {
    const hrt_run_start = process.hrtime();
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      const [result, status] = await this._run({ ...execution_data, external_input }, lisp);

      const hrt_run_interval = process.hrtime(hrt_run_start);
      const time_elapsed = Math.ceil(hrt_run_interval[0] * 1000 + hrt_run_interval[1] / 1000000);

      return {
        node_id: this.id,
        bag: this._setBag(bag, result),
        external_input: external_input,
        result: result,
        error: null,
        status: status,
        next_node_id: this.next(result),
        time_elapsed: time_elapsed,
      };
    } catch (err) {
      const hrt_run_interval = process.hrtime(hrt_run_start);
      const time_elapsed = Math.ceil(hrt_run_interval[0] * 1000 + hrt_run_interval[1] / 1000000);
      return this._processError(err, { bag, external_input, time_elapsed });
    }
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
        if (execution_data?.external_input) {
          return [execution_data, ProcessStatus.RUNNING];
        }
        return [execution_data, ProcessStatus.WAITING];
      }
    }
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  EventNode,
};
