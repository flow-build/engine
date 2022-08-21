const { Workflow } = require("../../workflow/workflow");
const { KnexPersist } = require("../knex");

class WorkflowKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Workflow, "workflow");
  }

  async get(id) {
    const workflow = await this._db.select("*").from(this._table).where("id", id).first();
    if (!workflow) {
      return undefined;
    }
    const latest = await this._checkWhetherIsLatest(workflow);
    return { ...workflow, ...{ latest } };
  }

  async getAll() {
    return this._db
      .select("*")
      .from(`${this._table} as w1`)
      .whereRaw(`w1.version = (select max(version) from ${this._table} as w2 where w1.name = w2.name)`);
  }

  async save(workflow) {
    await this._db.transaction(async (trx) => {
      const current_version = (
        await this._db(this._table).transacting(trx).max("version").where({ name: workflow.name }).first()
      ).max;
      return this._db(this._table)
        .transacting(trx)
        .insert({
          ...workflow,
          version: current_version + 1,
        });
    });
    return "create";
  }

  async getByName(name) {
    const workflow = await this._db.select("*").from(this._table).where({ name }).orderBy("version", "desc").first();
    return { ...workflow, ...{ latest: true } };
  }

  async getByNameAndVersion(name, version) {
    const workflow = await this._db
      .select("*")
      .from(this._table)
      .where({
        name,
        version,
      })
      .first();
    if (!workflow) {
      return undefined;
    }
    const latest = await this._checkWhetherIsLatest(workflow);
    return { ...workflow, ...{ latest } };
  }

  async getByHash(hash) {
    return this._db.select("*").from(this._table).where({ blueprint_hash: hash });
  }

  async _checkWhetherIsLatest(workflow) {
    const latestVersion = await this._db.max("version").from(this._table).where("name", workflow.name).first();
    return workflow.version === latestVersion.max;
  }
}

module.exports = {
  WorkflowKnexPersist: WorkflowKnexPersist,
};
