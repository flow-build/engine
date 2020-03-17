const { BaseEntity } = require("./base");

class ProcessStatus {

  static get UNSTARTED() {
    return "unstarted";
  }
  static get WAITING() {
    return "waiting";
  }
  static get RUNNING() {
    return "running";
  }
  static get FINISHED() {
    return "finished";
  }
  static get ERROR() {
    return "error";
  }
  static get INTERRUPTED() {
    return "interrupted";
  }

  static get FORBIDDEN() {
    return "forbidden";
  }
}

class ProcessState extends BaseEntity {

  static serialize(state) {
    return {
      id: state._id,
      created_at: state._created_at,
      process_id: state._process_id,
      step_number: state._step_number,
      node_id: state._node_id,
      next_node_id: state._next_node_id,
      bag: state._bag,
      external_input: state._external_input,
      result: state._result,
      error: state._error,
      status: state._status
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const state = new ProcessState(
        serialized.process_id,
        serialized.step_number,
        serialized.node_id,
        serialized.bag,
        serialized.external_input,
        serialized.result,
        serialized.error,
        serialized.status,
        serialized.next_node_id);
      state._id = serialized.id;
      state._created_at = serialized.created_at;
      return state;
    }
    return undefined;
  }

  constructor(process_id, step_number, node_id, bag, external_input,
              result, error, status, next_node_id) {
    super();

    this._process_id = process_id;
    this._step_number = step_number;
    this._node_id = node_id;
    this._bag = bag;
    this._external_input = external_input;
    this._result = result;
    this._error = error;
    this._status = status;
    this._next_node_id = next_node_id;
  }

  get process_id() {
    return this._process_id;
  }

  get step_number() {
    return this._step_number;
  }

  get node_id() {
    return this._node_id;
  }

  get bag() {
    return this._bag;
  }

  get external_input() {
    return this._external_input;
  }

  get result() {
    return this._result;
  }

  get error() {
    return this._error;
  }

  get status() {
    return this._status;
  }

  get next_node_id() {
    return this._next_node_id;
  }
}

module.exports = {
  ProcessStatus: ProcessStatus,
  ProcessState: ProcessState
};
