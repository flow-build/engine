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
}

module.exports = {
  TimerKnexPersist: TimerKnexPersist,
};
