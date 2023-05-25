const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const ajvValidator = require("../../utils/ajvValidator");
const emitter = require("../../utils/emitter");
const { Node } = require("./node");
const { prepare } = require("../../utils/input");
const { Timer } = require("../timer");

class StartNode extends Node {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["input_schema"],
          properties: {
            input_schema: { type: "object" },
            timeout: { type: "integer" },
            duration: { type: "string" },
            target: {
              type: "object",
              properties: {
                definition: { type: "string" }
              }
            }
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(StartNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    let [is_valid, error] = StartNode.validate(this._spec);
    if (is_valid) {
      /* 
      validate the input_schema against the node spec
      the process can be started as a subProcess or via startProcess, in both cases the engine will inject a property into the bag to pass the parent process id
      the input_schema needs to be updated accordingly.
      TODO: move the parent process data to the process parameters instead of the bag
      */
      try {
        let inputSchema = this._spec.parameters.input_schema;
        if (
          inputSchema.properties &&
          // eslint-disable-next-line no-prototype-builtins
          inputSchema.hasOwnProperty("additionalProperties") &&
          !inputSchema.additionalProperties
        ) {
          inputSchema.properties["parent_process_data"] = {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", format: "uuid" },
              expected_step_number: { type: "integer" },
            },
          };
        }
        ajvValidator.validateSchema(inputSchema);
      } catch (err) {
        is_valid = false;
        error = err.message;
      }
    }
    emitter.emit("NODE.START_VALIDATED", "START NODE VALIDATED", { is_valid: is_valid, error: error });
    return [is_valid, error];
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
    }
    return { timeout, process_id: parameters?.process_id, bag, input, actor_data };
  }

  async _run(execution_data) {
    ajvValidator.validateData(this._spec.parameters.input_schema, execution_data.bag);

    if (execution_data.timeout) {
      emitter.emit("PROCESS.TIMER.CREATING", `  CREATING PROCESS TIMER ON PID [${execution_data.process_id}]`, {
        process_id: execution_data.process_id,
      });
      let timer = new Timer("Process", execution_data.process_id, Timer.timeoutFromNow(execution_data.timeout), {
        actor_data: execution_data.actor_data,
      });
      await timer.save();
      await Timer.addJob({
        name: "process",
        payload: {
          resourceId: execution_data["process_id"],
          resourceType: "process",
        },
        options: {
          jobId: execution_data.process_id,
          delay: execution_data["timeout"] * 1000,
        },
      });
      emitter.emit("PROCESS.TIMER.NEW", `  PROCESS TIMER ON PID [${execution_data.process_id}] TIMER [${timer.id}]`, {
        process_id: execution_data.id,
        timer_id: timer.id,
      });
    }
    let result = {
      timeout: execution_data.timeout,
    };
    return [result, ProcessStatus.RUNNING];
  }

  _setBag(bag) {
    return bag;
  }
}

module.exports = {
  StartNode: StartNode,
};
