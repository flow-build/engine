/* eslint-disable indent */
/* eslint-disable no-unused-vars */
const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ProcessStatus } = require("../process_state");
const emitter = require("../../utils/emitter");

class Node {
  static get schema() {
    return {
      type: "object",
      required: ["id", "name", "next", "type", "lane_id", "parameters"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        type: { type: "string" },
        category: { type: "string" },
        lane_id: { type: "string" },
        on_error: { type: "string", enum: ["resumenext", "stop"] },
        parameters: {
          type: "object",
        },
        extract: { type: "string", pattern: "^[a-zA-Z0-9_.]+$" },
      },
    };
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(Node.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return Node.validate(this._spec);
  }

  constructor(node_spec = {}) {
    this._spec = node_spec;
  }

  get id() {
    return this._spec["id"];
  }

  next(result) {
    return this._spec["next"];
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {}, parameters = {} }, lisp) {
    const hrt_run_start = process.hrtime();
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      const [result, status] = await this._run(execution_data, lisp);

      const hrt_run_interval = process.hrtime(hrt_run_start);
      const time_elapsed = Math.ceil(hrt_run_interval[0] * 1000 + hrt_run_interval[1] / 1000000);
      const node_extract = this._spec?.extract;

      return {
        node_id: this.id,
        bag: this._setBag(bag, result, parameters?._extract, node_extract),
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

  // MUST RETURN [result, status]
  _run(execution_data, lisp) {
    throw Error("Subclass and implement returning [result: {}, status: ProcessStatus]");
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    return { ...bag, ...input, actor_data, environment, parameters };
  }

  _parseNodeId() {
    return this.id.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  }

  _mapResult(result) {
    return result;
  }

  _setBag(bag, result, _extract = false, node_extract = "") {
    const mapped_result = this._mapResult(result);
    if (node_extract?.length > 0) {
      _.set(bag, node_extract.toLowerCase(), mapped_result);
    } else if (_extract) {
      const bag_property = this._parseNodeId();
      _.set(bag, bag_property, mapped_result);
    }

    return bag;
  }

  _processError(error, { bag, external_input, time_elapsed }) {
    if (error instanceof Error) {
      emitter.emit("NODE.ERROR", `ERROR AT NID [${this.id}]`, {
        node_id: this.id,
        error: error,
      });
      error = error.toString();
    }
    let on_error = this._spec.on_error;
    if (on_error && typeof on_error === "string") {
      on_error = on_error.toLowerCase();
    }

    let result;
    switch (on_error) {
      case "resumenext": {
        result = {
          node_id: this.id,
          bag: bag,
          external_input: external_input,
          result: {
            error: error,
            is_error: true,
          },
          error: null,
          status: ProcessStatus.RUNNING,
          next_node_id: this.id,
          time_elapsed,
        };
        break;
      }
      case "stop":
      default: {
        result = {
          node_id: this.id,
          bag: bag,
          external_input: external_input,
          result: null,
          error: error,
          status: ProcessStatus.ERROR,
          next_node_id: this.id,
          time_elapsed,
        };
        break;
      }
    }

    return result;
  }
}

module.exports = {
  Node: Node,
};
