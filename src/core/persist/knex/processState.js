const { KnexPersist } = require("../knex");
const { ProcessState } = require("../../workflow/process_state");

class ProcessStateKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, ProcessState, "process_state");
  }

  async getByNodeId(processId, nodeId) {
    return await this._db
      .select("*")
      .from(this._table)
      .where({
        process_id: processId,
        node_id: nodeId,
      })
      .orderBy("step_number");
  }

  async getByStepNumber(processId, stepNumber) {
    return await this._db
      .select("*")
      .from(this._table)
      .where({
        process_id: processId,
        step_number: stepNumber,
      })
      .first();
  }
}

module.exports = { ProcessStateKnexPersist };
