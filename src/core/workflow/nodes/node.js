const _ = require("lodash");
const obju = require("../../utils/object");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const emitter = require("../../utils/emitter");

class Node {
  static get rules() {
    return {
      has_id: [obju.hasField, "id"],
      has_type: [obju.hasField, "type"],
      has_name: [obju.hasField, "name"],
      has_next: [obju.hasField, "next"],
      has_lane_id: [obju.hasField, "lane_id"],
      id_has_valid_type: [obju.isFieldOfType, "id", "string"],
      type_has_valid_type: [obju.isFieldOfType, "type", "string"],
      next_has_valid_type: [obju.isFieldTypeIn, "next", ["string", "object"]],
      lane_id_has_valid_type: [obju.isFieldOfType, "lane_id", "string"],
    };
  }

  static validate(spec) {
    return new Validator(this.rules).validate(spec);
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

  validate() {
    return Node.validate(this._spec);
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {}, parameters = {} }, lisp) {
    const hrt_run_start = process.hrtime();
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      const [result, status] = await this._run(execution_data, lisp);

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

  // MUST RETURN [result, status]
  _run(execution_data, lisp) {
    throw Error("Subclass and implement returning [result: {}, status: ProcessStatus]");
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    return { ...bag, ...input, actor_data, environment, parameters };
  }

  _setBag(bag, result) {
    return bag;
  }

  _processError(error, { bag, external_input, time_elapsed }) {
    console.log(error);
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
