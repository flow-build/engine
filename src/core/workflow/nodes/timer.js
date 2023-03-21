const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { SystemTaskNode } = require("./systemTask");
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
    let timeout;
    if (this._spec.parameters.timeout) {
      timeout = prepare(this._spec.parameters.timeout, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
    } else if (this._spec.parameters.duration) {
      const preparedDuration = prepare(this._spec.parameters.duration, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
      timeout = Timer.durationToSeconds(preparedDuration);
    } else if (this._spec.parameters.dueDate) {
      const preparedDueDate = prepare(this._spec.parameters.dueDate, {
        bag,
        result: input,
        actor_data,
        environment,
        parameters,
      });
      timeout = Timer.dueDateToSeconds(preparedDueDate);
    }
    return {
      timeout,
      process_id: parameters?.process_id,
      //input.step_number is the one from previous state, so +1 is required.
      step_number: input?.step_number + 1,
      actor_data,
    };
  }

  // eslint-disable-next-line no-unused-vars
  async _run(execution_data = {}) {
    if (!execution_data.timeout) {
      return [execution_data, ProcessStatus.ERROR];
    }

    try {
      let timer = new Timer("Process", execution_data.process_id, Timer.timeoutFromNow(execution_data.timeout), {
        actor_data: execution_data.actor_data,
      });
      await timer.save();
      await Timer.addJob({
        name: "intermediateevent",
        payload: {
          resourceId: execution_data["process_id"],
          resourceType: "process",
          stepNumber: execution_data["step_number"],
        },
        options: {
          jobId: `${execution_data["process_id"]}-${this._spec.id}`,
          //delay should be in milliseconds, the spec expects the timeout in seconds
          delay: execution_data["timeout"] * 1000,
        },
      });
      emitter.emit("PROCESS.TIMER.NEW", `NEW TIMER ON PID [${execution_data.process_id}] TIMER [${timer.id}]`, {
        process_id: this.id,
        timer_id: timer.id,
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
