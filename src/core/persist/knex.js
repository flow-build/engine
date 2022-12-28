const _ = require('lodash');
const { Packages } = require("../workflow/packages");
const { ActivityManager } = require("../workflow/activity_manager");
const { Activity } = require("../workflow/activity");
const { Timer } = require("../workflow/timer");

class KnexPersist {
  constructor(db, class_, table) {
    this._db = db;
    this._class = class_;
    this._table = table;
    this.SQLite = (this._db.client.config.dialect || this._db.context.client.config.client) === "sqlite3";
  }

  async save(obj, ...args) {
    const is_update = obj.id && (await this.get(obj.id));
    obj.created_at = new Date(obj.created_at).toISOString();

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

  async getAll() {
    return await this._db.select("*").from(this._table).orderBy("created_at", "desc");
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

class ActivityManagerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, ActivityManager, "activity_manager");
    this._process_state_table = "process_state";
    this._process_table = "process";
    this._workflow_table = "workflow";
    this._activity_table = "activity";
  }

  getActivityDataFromStatusQuery(status, filters) {
    return this._db
      .select(
        "am.id",
        "am.created_at",
        "am.type",
        "am.process_state_id",
        "am.props",
        "am.parameters",
        "am.status as activity_status",
        "ps.process_id",
        "ps.step_number",
        "ps.node_id",
        "ps.next_node_id",
        "ps.bag",
        "ps.external_input",
        "ps.error",
        "ps.status as process_status",
        "p.workflow_id",
        "p.blueprint_spec",
        "p.current_status as current_status",
        "wf.name as workflow_name",
        "wf.description as workflow_description"
      )
      .from("activity_manager AS am")
      .rightJoin("process_state AS ps", "am.process_state_id", "ps.id")
      .rightJoin("process AS p", "ps.process_id", "p.id")
      .rightJoin("workflow AS wf", "p.workflow_id", "wf.id")
      .where("am.status", "=", status)
      .modify((builder) => {
        if (filters) {
          if (filters.workflow_id) {
            builder.where({ "wf.id": filters.workflow_id });
          }
          if (filters.process_id) {
            builder.where({ "p.id": filters.process_id });
          }
          if (filters.status) {
            builder.where({ "am.status": filters.status });
          }
          if (filters.type) {
            builder.where({ "am.type": filters.type });
          }
          if (filters.current_status) {
            builder
              .where({ "p.current_status": filters.current_status[0] })
              .orWhere({ "p.current_status": filters.current_status[1] })
              .orWhere({ "p.current_status": filters.current_status[2] })
              .orWhere({ "p.current_status": filters.current_status[3] });
          }
        }
      })
      .orderBy("am.created_at", "asc");
  }

  async getActivityDataFromStatus(status, filters, trx) {
    if(trx) {
      return await this.getActivityDataFromStatusQuery(status, filters)
      .transacting(trx);
    }
    return await this.getActivityDataFromStatusQuery(status, filters)
  }

  async getActiveActivityManagers() {
    return await this._db(this._table)
        .where("status", "started");
  }

  async getCompletedActivityManagers() {
    return await this._db(this._table)
        .where("status", "completed");
  }

  async getActivityDataFromId(obj_id) {
    return await this._db
      .select(
        "am.id",
        "am.created_at",
        "am.type",
        "am.process_state_id",
        "am.props",
        "am.parameters",
        "am.status as activity_status",
        "ps.process_id",
        "ps.step_number",
        "ps.node_id",
        "ps.next_node_id",
        "ps.bag",
        "ps.external_input",
        "ps.error",
        "ps.status as process_status",
        "p.workflow_id",
        "p.blueprint_spec",
        "wf.name as workflow_name",
        "wf.description as workflow_description"
      )
      .from("activity_manager AS am")
      .rightJoin("process_state AS ps", "am.process_state_id", "ps.id")
      .rightJoin("process AS p", "ps.process_id", "p.id")
      .rightJoin("workflow AS wf", "p.workflow_id", "wf.id")
      .where("am.id", "=", obj_id)
      .first();
  }

  async getProcessId(process_state_id) {
    const activity = await this._db
        .select('process_id')
        .from('process_state')
        .where('id', '=', process_state_id)
        .first();

    return this._parseToJson(activity);
  }

  async getActivityManagerByProcessStateId(process_state_id) {
    return await this._db
        .select('*')
        .from('activity_manager')
        .where('process_state_id', '=', process_state_id);
  }

  async getActivities(activity_manager_id) {
    return await this._db.select().from(this._activity_table).where("activity_manager_id", activity_manager_id);
  }

  async getTimerfromResourceId(resource_id) {
    return await this._db.select().from("timer").where("resource_id", resource_id);
  }

  async save(obj, ...args) {

    if(this.SQLite){
      obj.parameters = JSON.stringify(obj.parameters);
      obj.props = JSON.stringify(obj.props);
    }

    return super.save(obj, ...args);
  }
}

class ActivityKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Activity, "activity");
  }

  async save(obj, ...args) {

    if(this.SQLite){
      obj.actor_data = JSON.stringify(obj.actor_data);
      obj.data = JSON.stringify(obj.data || {});
    }

    return super.save(obj, ...args);
  }
}

class TimerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Timer, "timer");
  }

  getAllReady() {
    const date = this.SQLite ? new Date().toISOString() : new Date();
    return this._db.select().from(this._table).where("expires_at", "<", date).andWhere("active", true);
  }

  async save(obj, ...args) {

    if( this.SQLite ){
      obj.params = JSON.stringify(obj.params);
      obj.expires_at = obj.expires_at.toISOString()
    }

    return super.save(obj, ...args);
  }
}

module.exports = {
  KnexPersist: KnexPersist,
  PackagesKnexPersist: PackagesKnexPersist,
  ActivityManagerKnexPersist: ActivityManagerKnexPersist,
  ActivityKnexPersist: ActivityKnexPersist,
  TimerKnexPersist: TimerKnexPersist,
};
