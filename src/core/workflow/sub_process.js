const { PersistedEntity } = require("./base");

class SubProcess extends PersistedEntity {

  static getEntityClass() {
    return SubProcess;
  }

  static serialize(sub_process) {
    return {
      id: sub_process._id,
      created_at: sub_process._created_at,
      process_father_id: sub_process._process_father_id,
      process_son_id: sub_process._process_son_id,
      props: sub_process._props,
      parameters: sub_process._parameters,
      status: sub_process._status,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const sub_process = new SubProcess(
        serialized.process_father_id,
        serialized.process_son_id,
        serialized.props,
        serialized.parameters,
        serialized.status);
      sub_process._id = serialized.id;
      sub_process._created_at = serialized.created_at;

      return sub_process;
    }
    return undefined;
  }

  constructor(process_father_id, process_son_id, props, parameters, status) {
    super();

    this._process_father_id = process_father_id;
    this._process_son_id = process_son_id;
    this._props = props;
    this._parameters = parameters;
    this._status = status;
  }

  get process_father_id() {
    return this._process_father_id;
  }

  get process_son_id() {
    return this._process_son_id;
  }

  get props() {
    return this._props;
  }

  get parameters() {
    return this._parameters;
  }

  get status() {
    return this._status;
  }

}

module.exports.SubProcess = SubProcess;
