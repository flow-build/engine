const { KnexPersist } = require("../knex");
const { WorkflowKnexPersist } = require("../knex/workflow");
const { EnvironmentVariable } = require("../../workflow/environment_variable");

class EnvironmentVariableKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, EnvironmentVariable, "environment_variable");
  }

  async save(obj, ...args) {
    const is_update = obj.key && (await this.get(obj.key));
    if (is_update) {
      await this.update(obj.key, obj, ...args);
      return "update";
    }
    await this.create(obj, ...args);
    return "create";
  }

  async create(obj) {
    await this._db(this._table).insert(obj);
  }

  async update(obj_key, obj) {
    await this._db(this._table).where("key", obj_key).update(obj);
  }

  async get(key) {
    return await this._db.select("*").from(this._table).where('key', key).first();
  }

  async delete(key) {
    return await this._db(this._table).where("key", key).del();
  }
}

module.exports = { EnvironmentVariableKnexPersist };
