const { Workflow } = require("../../workflow/workflow");
const { KnexPersist, ExtraFieldsKnexPersist } = require("../knex");
const _ = require('lodash');

class WorkflowKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Workflow, "workflow");
  }

  async get(id) {
    let workflow = await this._db
      .select("*")
      .from(this._table)
      .leftJoin("extra_fields AS ef", function() {
        this
          .on("workflow.id", "=", "ef.entity_id")
          .onIn("ef.entity_name", ["workflow"])
      })
      .where("id", id)
      .first();
    if (!workflow) {
      return undefined;
    }
    const latest = await this._checkWhetherIsLatest(workflow);
    return { ...workflow, ...{ latest } };
  }

  async getAll() {
    const wfs = await this._db
      .select("*")
      .from(`${this._table} as w1`)
      .whereRaw(`w1.version = (select max(version) from ${this._table} as w2 where w1.name = w2.name)`)
    return _.map(wfs, Workflow.deserialize);
  }

  async save(workflow) {
    const { extra_fields } = workflow;
    delete workflow.extra_fields

    if (extra_fields) {
      await new ExtraFieldsKnexPersist(this._db)
        ._create({
          entity_id: workflow.id,
          entity_name: "workflow",
          extra_fields
        });
    }

    await this._db.transaction(async (trx) => {
      const current_version = await this._db(this._table).max("version").where({ name: workflow.name }).first()
      const version = current_version.max || _.get(current_version, "max(`version`)") || 0;

      if(this.SQLite){
        workflow.blueprint_spec = JSON.stringify(workflow.blueprint_spec);
      }

      return this._db(this._table)
        .transacting(trx)
        .insert({
          ...workflow,
          version: version + 1,
        });
    });
    return "create";
  }

  async getByName(name) {
    const workflow = await this._db
      .select("*")
      .from(this._table)
      .leftJoin("extra_fields AS ef", function() {
        this
          .on("workflow.id", "=", "ef.entity_id")
          .onIn("ef.entity_name", ["workflow"])
      })
      .where({ name })
      .orderBy("version", "desc")
      .first();
    return { ...workflow, ...{ latest: true } };
  }

  async getByNameAndVersion(name, version) {
    const workflow = await this._db
      .select("*")
      .from(this._table)
      .leftJoin("extra_fields AS ef", function() {
        this
          .on("workflow.id", "=", "ef.entity_id")
          .onIn("ef.entity_name", ["workflow"])
      })
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
    const version = latestVersion.max || _.get(latestVersion, "max(`version`)") || 0;
    return workflow.version === version;
  }
}

module.exports = {
  WorkflowKnexPersist: WorkflowKnexPersist,
};
