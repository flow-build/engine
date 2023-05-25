const { KnexPersist } = require("../knex");
const { WorkflowKnexPersist } = require("../knex/workflow");
const { EnvironmentVariable } = require("../../workflow/environment_variable");

class EnvironmentVariableKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, EnvironmentVariable, "environment_variable");
  }

  async update(key, value, type) {
    return await this._db(this._table)
      .where("key", key)
      .update({ value, type, updated_at: "now" })
      .returning("*");
  }

  async get(key) {
    return await this._db.select("*").from(this._table).where("key", key).first();
  }

  async delete(key) {
    return await this._db(this._table).where("key", key).del();
  }
}

module.exports = { EnvironmentVariableKnexPersist };
