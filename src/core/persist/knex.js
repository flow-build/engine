const { Packages } = require("../workflow/packages");
const { Activity } = require("../workflow/activity");

class KnexPersist {
  constructor(db, class_, table) {
    this._db = db;
    this._class = class_;
    this._table = table;
  }

  async save(obj, ...args) {
    const is_update = obj.id && (await this.get(obj.id));
    if (is_update) {
      await this._update(obj.id, obj, ...args);
      return "update";
    }
    await this._create(obj, ...args);
    return "create";
  }

  async delete(obj_id, trx) {
    if (trx) {
      return await this._db(this._table).where("id", obj_id).transacting(trx).del();
    } else {
      return await this._db(this._table).where("id", obj_id).del();
    }
  }

  async deleteAll() {
    return await this._db(this._table).del();
  }

  async get(obj_id) {
    return await this._db.select("*").from(this._table).where("id", obj_id).first();
  }

  async _create(obj, trx = false) {
    if (trx) {
      await this._db(this._table).transacting(trx).insert(obj);
    } else {
      await this._db(this._table).insert(obj);
    }
  }

  async _update(obj_id, obj, trx = false) {
    try {
      if (trx) {
        await this._db(this._table).transacting(trx).where("id", obj_id).update(obj);
      } else {
        await this._db(this._table).where("id", obj_id).update(obj);
      }
    } catch (e) {
      emitter.emit("KNEX.UPDATE_ERROR", "Unable to update object", { error: e, id: obj_id });
    }
  }
}

class PackagesKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Packages, "packages");
  }

  async getByName(obj_name) {
    return await this._db.select("*").from(this._table).where("name", "=", obj_name).first();
  }
}

class ActivityKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Activity, "activity");
  }
}

module.exports = {
  KnexPersist: KnexPersist,
  PackagesKnexPersist: PackagesKnexPersist,
  ActivityKnexPersist: ActivityKnexPersist,
};
