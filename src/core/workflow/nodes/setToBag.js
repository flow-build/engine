const { ProcessStatus } = require("../process_state");
const { SystemTaskNode } = require("./systemTask");

class SetToBagSystemTaskNode extends SystemTaskNode {
  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {}, parameters = {} }, lisp) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
      return {
        node_id: this.id,
        bag: { ...bag, ...execution_data },
        external_input: external_input,
        result: input,
        error: null,
        status: ProcessStatus.RUNNING,
        next_node_id: this.next(),
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }
}

module.exports = {
  SetToBagSystemTaskNode,
};
