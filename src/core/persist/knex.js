const { Workflow } = require("../workflow/workflow");
const { Packages } = require("../workflow/packages");
const { Process } = require("../workflow/process");
const { ProcessState } = require("../workflow/process_state");
const { ActivityManager } = require("../workflow/activity_manager");
const { Activity } = require("../workflow/activity");
const { Timer } = require("../workflow/timer");

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

class WorkflowKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Workflow, "workflow");
  }

  async getAll() {
    return await this._db
      .select("*")
      .from(`${this._table} as w1`)
      .whereRaw(`w1.version = (select max(version) from ${this._table} as w2 where w1.name = w2.name)`);
  }

  async save(workflow) {
    await this._db.transaction(async (trx) => {
      const current_version = (
        await this._db(this._table).transacting(trx).max("version").where({ name: workflow.name }).first()
      ).max;
      return await this._db(this._table)
        .transacting(trx)
        .insert({
          ...workflow,
          version: current_version + 1,
        });
    });
    return "create";
  }

  async getByName(obj_name) {
    return await this._db.select("*").from(this._table).where("name", "=", obj_name).orderBy("version", "desc").first();
  }

  async getByHash(hash) {
    return await this._db.select("*").from(this._table).where("blueprint_hash", "=", hash);
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

class ProcessKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Process, "process");
    this._state_class = ProcessState;
    this._state_table = "process_state";
  }

  async get(process_id) {
    return await this._db.transaction(async (trx) => {
      const process = await this._db
        .select(`${this._table}.*`, "workflow.name as workflow_name")
        .from(this._table)
        .join("workflow", "workflow.id", "workflow_id")
        .where(`${this._table}.id`, process_id)
        .first()
        .transacting(trx);
      if (process) {
        process.state = await this.getLastStateByProcess(process_id).transacting(trx);
      }
      return process;
    });
  }

  async getAll(filters) {
    const processes = await this._db
      .select(`${this._table}.*`, "workflow.name as workflow_name")
      .from(this._table)
      .join("workflow", "workflow.id", "workflow_id")
      .orderBy("process.created_at", "desc")
      .modify((builder) => {
        if (filters) {
          const available_filters = ["workflow_id", "process.id", "name", "current_status"];
          const _filters_keys = Object.keys(filters).filter((key) => available_filters.includes(key));
          for (const key of _filters_keys) {
            if (typeof filters[key] === "string") {
              builder.where({ [key]: filters[key] });
            } else {
              if (Array.isArray(filters[key])) {
                builder.whereIn([key], filters[key]);
              }
            }
          }
          if (filters.limit) {
            builder.limit(filters.limit);
            if (filters.offset) {
              builder.offset(filters.offset);
            }
          }
        }
      });
    for (const process of processes) {
      process.state = await this.getLastStateByProcess(process.id);
    }
    return processes;
  }

  async delete(process_id) {
    //todo trx
    try {
      return await this._db.transaction(async (trx) => {
        await this._db(this._state_table).transacting(trx).where("process_id", process_id).del();
        return await this._db(this._table).transcting(trx).del();
      });
    } catch (e) {
      emitter.emit("KNEX.DELETE_PROCESS_ERROR", `Unable delete Process with PID [${this.id}]`, {
        error: e,
        process_id: this.id,
      });
    }
  }

  async deleteAll() {
    //todo trx
    return await this._db.transaction(async (trx) => {
      await this._db(this._state_table).transacting(trx).del();
      return await this._db(this._table).transacting(trx).del();
    });
  }

  getStateHistoryByProcess(process_id) {
    return this._db.select("*").from(this._state_table).where("process_id", process_id).orderBy("step_number", "desc");
  }

  getLastStateByProcess(process_id) {
    return this._db
      .select(`${this._state_table}.*`)
      .from(this._table)
      .innerJoin(this._state_table, "process_state.id", "current_state_id")
      .where("process.id", process_id)
      .first();
  }

  async getLastStepNumber(process_id) {
    const last_step = await this._db(this._state_table).max("step_number").where("process_id", process_id).first();
    const count = Number(last_step.max);
    return count;
  }

  async getTasks(filters) {
    return await this._getTasks(filters);
  }

  async getWorkflowWithProcesses(filters) {
    const processes = await this._db
      .select(
        "wf.id as id",
        "wf.name as name",
        "wf.description as description",
        "wf.version as version",
        "p.id as process_id"
      )
      .from("workflow as wf")
      .leftJoin("process as p", "wf.id", "p.workflow_id")
      .modify((builder) => {
        if (filters) {
          if (filters.workflow_id) {
            builder.where("wf.id", filters.workflow_id);
          }

          if (filters.start_date) {
            builder.where("p.created_at", ">=", filters.start_date);
          }

          if (filters.end_date) {
            builder.where("p.created_at", "<=", filters.end_date);
          }
        }
      });
    for (const process of processes) {
      process.state = await this.getLastStateByProcess(process.process_id);
    }
    return processes;
  }

  async _create(process) {
    //todo trx
    try {
      await this._db.transaction(async (trx) => {
        const state = process.state;
        delete process["state"];
        await this._db(this._table).transacting(trx).insert(process);
        if (state) {
          await this._db(this._state_table).transacting(trx).insert(state);
        }
      });
    } catch (e) {
      emitter.emit("KNEX.CREATE_PROCESS_ERROR", `Unable to create Process with PID [${this.id}]`, {
        error: e,
        process_id: this.id,
      });
    }
  }

  async _update(process_id, process, trx = false) {
    const state = process.state;
    delete process["state"];

    if (trx) {
      await trx(this._state_table).insert(state);
      await trx(this._table).where("id", process_id).update(process);
    } else {
      try {
        await this._db.transaction(async (trx) => {
          await this._db(this._state_table).insert(state).transacting(trx);
          await this._db(this._table).where("id", process_id).update(process).transacting(trx);
        });
      } catch (e) {
        emitter.emit("KNEX.UPDATE_PROCESS_ERROR", `Unable to update Process with PID [${process_id}]`, {
          error: e,
          process_id,
        });
      }
    }
  }

  _getTasks(filters) {
    return this._db
      .select(
        "w.name as workflow_name",
        "w.blueprint_spec as blueprint_spec",
        "p.id as process_id",
        "ps.status as process_status",
        "ps.created_at as process_last_update",
        "ps.step_number as process_step_number",
        "ps.node_id as current_node_id",
        "ps.bag as bag"
      )
      .from("process_state as ps")
      .leftJoin("process as p", "ps.process_id", "p.id")
      .leftJoin("workflow as w", "p.workflow_id", "w.id")
      .modify((builder) => {
        if (filters) {
          if (filters.workflow_id) {
            builder.where({ "w.id": filters.workflow_id });
          }
        }
      });
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

  async getActiveActivityManagers() {
    return await this._db(this._table).where("status", "started");
  }

  async getCompletedActivityManagers() {
    return await this._db(this._table).where("status", "completed");
  }

  async getActivityDataFromStatus(status, filters) {
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
    return await this._db.select("process_id").from("process_state").where("id", "=", process_state_id).first();
  }

  async getActivityManagerByProcessStateId(process_state_id) {
    return await this._db.select("*").from("activity_manager").where("process_state_id", "=", process_state_id);
  }

  async getActivities(activity_manager_id) {
    return await this._db.select().from(this._activity_table).where("activity_manager_id", activity_manager_id);
  }

  async getTimerfromResourceId(resource_id) {
    return await this._db.select().from("timer").where("resource_id", resource_id);
  }
}

class ActivityKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Activity, "activity");
  }
}

class TimerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Timer, "timer");
  }

  getAllReady() {
    return this._db.select().from(this._table).where("expires_at", "<", new Date()).andWhere("active", true);
  }
}

module.exports = {
  KnexPersist: KnexPersist,
  WorkflowKnexPersist: WorkflowKnexPersist,
  PackagesKnexPersist: PackagesKnexPersist,
  ProcessKnexPersist: ProcessKnexPersist,
  ActivityManagerKnexPersist: ActivityManagerKnexPersist,
  ActivityKnexPersist: ActivityKnexPersist,
  TimerKnexPersist: TimerKnexPersist,
};
