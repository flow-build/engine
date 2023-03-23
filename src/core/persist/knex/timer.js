const { Timer } = require("../../workflow/timer");
const { KnexPersist } = require("../knex");

class TimerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Timer, "timer");
  }

  getAllActive() {
    return this._db.select().from(this._table).where("active", true);
  }

  getAllReady() {
    return this._db.select().from(this._table).where("expires_at", "<", new Date()).andWhere("active", true);
  }

  async getByResource({ resource_type, resource_id }) {
    return await this._db
      .select("*")
      .from(this._table)
      .where("resource_type", resource_type)
      .andWhere("resource_id", resource_id)
      .andWhere("active", true)
      .first();
  }

  async updateExpiration({ id, expires_at }) {
    return await this._db.from(this._table).where("id", id).update({ expires_at: expires_at }).returning("*");
  }

  async deactivate({ resource_type, resource_id, trx }) {
    if (trx) {
      return await this._db
        .from(this._table)
        .where("resource_type", resource_type)
        .andWhere("resource_id", resource_id)
        .update({ active: false })
        .transacting(trx);
    } else {
      return await this._db
        .from(this._table)
        .where("resource_type", resource_type)
        .andWhere("resource_id", resource_id)
        .update({ active: false });
    }
  }

  async lock(trx, batch) {
    return await trx(this._table)
      .where("expires_at", "<", new Date())
      .andWhere("active", true)
      .limit(batch)
      .forUpdate()
      .skipLocked();
  }
}

module.exports = {
  TimerKnexPersist: TimerKnexPersist,
};
