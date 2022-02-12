const { ProcessStatus } = require("../process_state");
const process_manager = require("../process_manager");
const { SystemTaskNode } = require("./systemTask");

class AbortProcessSystemTaskNode extends SystemTaskNode {
  validate() {
    return AbortProcessSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    const abort_result = await process_manager.abortProcess(execution_data);
    const result = {};
    for (let index = 0; index < abort_result.length; index++) {
      result[execution_data[index]] = abort_result[index].status;
    }
    return [result, ProcessStatus.RUNNING];
  }
}

module.exports = {
  AbortProcessSystemTaskNode,
};
