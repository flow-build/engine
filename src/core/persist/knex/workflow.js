const { Workflow } = require("../../workflow/workflow");
const { KnexPersist, ExtraFieldsKnexPersist } = require("../knex");
const _ = require('lodash');

class WorkflowKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Workflow, "workflow");
  }

  async get(id, trx) {
    let query = this._db
      .select("*")
      .from(this._table)
      .leftJoin("extra_fields AS ef", function() {
        this
          .on("workflow.id", "=", "ef.entity_id")
          .onIn("ef.entity_name", ["workflow"])
      })
      .where("id", id)
      .first();
    let workflow;
    let latest;
    if (this.SQLite || !trx) {
      workflow = await query;
    } else {
      workflow = await query.transacting(trx);
    }
    if (!workflow) {
      return undefined;
    }
    if (this.SQLite || !trx) {
      latest = await this._checkWhetherIsLatest(workflow);
    } else {
      latest = await this._checkWhetherIsLatest(workflow, trx);
    }
    return { ...workflow, ...{ latest } };
  }

  async getAll() {
    const wfs = await this._db
      .select("*")
      .from(`${this._table} as w1`)
      .leftJoin("extra_fields AS ef", function() {
        this
          .on("w1.id", "=", "ef.entity_id")
          .onIn("ef.entity_name", ["workflow"])
      })
      .whereRaw(`w1.version = (select max(version) from ${this._table} as w2 where w1.name = w2.name)`)
    return _.map(wfs, (wf) => Workflow.deserialize(wf));
  }

  async save(workflow) {
    if (this.SQLite){
      workflow.blueprint_spec = JSON.stringify(workflow?.blueprint_spec);
      workflow.extra_fields = JSON.stringify(workflow?.extra_fields);
    }
    const { extra_fields } = workflow;
    delete workflow.extra_fields;

    if (extra_fields) {
      await new ExtraFieldsKnexPersist(this._db)
        ._create({
          entity_id: workflow.id,
          entity_name: "workflow",
          extra_fields
        });
    }
    workflow.created_at = new Date(workflow.created_at).toISOString();

    await this._db.transaction(async (trx) => {
      const current_version = await this._db(this._table).max("version").where({ name: workflow.name }).first()
      const version = current_version.max || _.get(current_version, "max(`version`)") || 0;
      const query = this._db(this._table)
        .insert({
          ...workflow,
          version: version + 1,
        });
      if (this.SQLite) {
        return await query;
      } else {
        return await query.transacting(trx);
      }
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

  async getLatestVersionById(id, trx = false) {
    const { name: workflow_name } = await this.get(id, trx);
    
    const query = this._db.select("*").from(this._table).where({ name: workflow_name }).orderBy("version", "desc").first();

    let workflow;
    if (this.SQLite || !trx) {
      workflow = await query;
    } else {
      workflow = await query.transacting(trx);
    }

    return { ...workflow, ...{ latest: true } };
  }

  async getByHash(hash) {
    return this._db.select("*").from(this._table).where({ blueprint_hash: hash });
  }

  async _checkWhetherIsLatest(workflow, trx) {
    const query = this._db.max("version").from(this._table).where("name", workflow.name).first();
    let latestVersion;
    if (this.SQLite || !trx) {
      latestVersion = await query;
    } else {
      latestVersion = await query.transacting(trx);
    }
    const version = latestVersion.max || _.get(latestVersion, "max(`version`)") || 0;
    return workflow.version === version;
  }
}

module.exports = {
  WorkflowKnexPersist: WorkflowKnexPersist,
};
