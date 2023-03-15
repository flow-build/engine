const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { SystemTaskNode } = require("./systemTask");
const { toSeconds, parse } = require("iso8601-duration");
const { Timer } = require("../timer");

class TimerSystemTaskNode extends SystemTaskNode {
  static get schema() {
    return {
      type: "object",
      required: ["id", "name", "next", "lane_id", "parameters"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        next: { type: "string" },
        lane_id: { type: "string" },
        on_error: { type: "string", enum: ["resumenext", "stop"] },
        parameters: {
          anyOf: [
            {
              type: "object",
              required: ["timeout"],
              properties: {
                timeout: { oneOf: [{ type: "object" }, { type: "number" }] },
              },
            },
            {
              type: "object",
              required: ["dueDate"],
              properties: {
                dueDate: { oneOf: [{ type: "object" }, { type: "string", format: "date-time" }] },
              },
            },
            {
              type: "object",
              required: ["duration"],
              properties: {
                duration: { oneOf: [{ type: "object" }, { type: "string" }] },
              },
            },
          ],
        },
      },
    };
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(TimerSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return TimerSystemTaskNode.validate(this._spec);
  }

  _preProcessing({ bag, input, actor_data, environment, parameters = {} }) {
    const timeout = prepare(this._spec.parameters.timeout, {
      bag,
      result: input,
      actor_data,
      environment,
      parameters,
    });
    const duration = prepare(this._spec.parameters.duration, {
      bag,
      result: input,
      actor_data,
      environment,
      parameters,
    });

    const dueDate = prepare(this._spec.parameters.dueDate, {
      bag,
      result: input,
      actor_data,
      environment,
      parameters,
    });

    return {
      timeout,
      process_id: parameters?.process_id,
      //input.step_number is the one from previous state, so +1 is required.
      step_number: input?.step_number + 1,
      dueDate,
      duration,
    };
  }

  // eslint-disable-next-line no-unused-vars
  async _run(execution_data = {}, lisp) {
    if (execution_data["dueDate"]) {
      execution_data["timeout"] = (new Date(execution_data["dueDate"]).getTime() - new Date().getTime()) / 1000;
    } else if (execution_data["duration"]) {
      execution_data["timeout"] = toSeconds(parse(execution_data["duration"]));
    } else if (!execution_data["timeout"]) {
      return [execution_data, ProcessStatus.ERROR];
    }

    try {
      const job = {
        name: "intermediateevent",
        payload: {
          processId: execution_data["process_id"],
          stepNumber: execution_data["step_number"],
        },
        options: {
          //delay should be in milliseconds, the spec expects the timeout in seconds
          delay: execution_data["timeout"] * 1000,
        },
      };
      await Timer.addJob({
        name: job.name,
        payload: job.payload,
        options: job.options,
      });
    } catch (e) {
      return [{ error: e }, ProcessStatus.ERROR];
    }

    return [execution_data, ProcessStatus.PENDING];
  }
}

module.exports = {
  TimerSystemTaskNode,
};
