const { Workflow } = require("../workflow/workflow");
const { Packages } = require("../workflow/packages");
const { Process } = require("../workflow/process");
const { ProcessState } = require("../workflow/process_state");
const { ActivityManager } = require("../workflow/activity_manager");
const { Activity } = require("../workflow/activity");

class KnexPersist {

  constructor(db, class_, table) {
    this._db = db;
    this._class = class_;
    this._table = table;
  }

  async save(obj) {
    const is_update = obj.id && await this.get(obj.id);
    if (is_update) {
      await this._update(obj.id, obj);
      return "update";
    }
    await this._create(obj);
    return "create";
  }

  async delete(obj_id) {
    return await this._db(this._table).where('id', obj_id).del();
  }

  async deleteAll() {
    return await this._db(this._table).del();
  }

  async get(obj_id) {
    return await this._db
      .select("*")
      .from(this._table)
      .where("id", obj_id)
      .first();
  }

  async getAll() {
    return await this._db
      .select("*")
      .from(this._table)
      .orderBy("created_at", "desc");
  }

  async _create(obj) {
    await this._db(this._table).insert(obj);
  }

  async _update(obj_id, obj) {
    await this._db(this._table).where('id', obj_id).update(obj);
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
      .whereRaw(`w1.version = (select max(version) from ${this._table} as w2 where w1.name = w2.name)`)
  }

  async save(workflow) {
    await this._db.transaction(async trx => {
      const current_version = (await this._db(this._table).transacting(trx).max("version").where({name: workflow.name}).first()).max
      return await this._db(this._table).transacting(trx).insert({
        ...workflow,
        version: current_version + 1,
      })
    });
    return 'create';
  }

  async getByName(obj_name) {
    return await this._db
      .select("*")
      .from(this._table)
      .where("name", "=", obj_name)
      .orderBy("version", "desc")
      .first();
  }
}

class PackagesKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Packages, "packages");
  }

  async getByName(obj_name) {
    return await this._db
      .select("*")
      .from(this._table)
      .where("name", "=", obj_name)
      .first();
  }
}

class ProcessKnexPersist extends KnexPersist {

  constructor(db) {
    super(db, Process, "process");
    this._state_class = ProcessState;
    this._state_table = "process_state";
  }

  async get(process_id) {
    const process = await this._db
          .select("*")
          .from(this._table)
          .where("id", process_id)
          .first();
    if (process) {
      process.state = await this.getLastStateByProcess(process_id);
    }
    return process;
  }

  async getAll(filters) {
      const processes = await this._db.select(
        "*")
        .from(this._table)
        .modify((builder) => {
          if (filters) {
            if (filters.workflow_id) {
              builder.where({"workflow_id": filters.workflow_id});
            }
          }
      });
      for (const process of processes) {
        process.state = await this.getLastStateByProcess(process.id);
      }
      return processes;
  }

  async delete(process_id) {
    return await this._db.transaction(async trx => {
      await this._db(this._state_table)
        .transacting(trx)
        .where("process_id", process_id)
        .del();
      return await this._db(this._table)
        .transcting(trx)
        .del();
    });
  }

  async deleteAll() {
    return await this._db.transaction(async trx => {
      await this._db(this._state_table).transacting(trx).del();
      return await this._db(this._table).transacting(trx).del();
    });
  }

  async getStateHistoryByProcess(process_id) {
    return await this._db
      .select("*")
      .from(this._state_table)
      .where("process_id", process_id)
      .orderBy("step_number", "desc");
  }

  async getLastStateByProcess(process_id) {
    return (await this.getStateHistoryByProcess(process_id))[0];
  }

  async getNextStepNumber(process_id) {
    const count_list = await this._db(this._state_table)
          .where("process_id", process_id)
          .count();
    const count = Number(count_list[0].count);
    return count + 1;
  }

  async getTasks(filters) {
    return await this._getTasks(filters);
  }

  async getWorkflowWithProcesses(status, filters) {
    const processes = await this._db.select(
      "wf.name as name",
      "wf.description as description",
      "wf.blueprint_spec as blueprint_spec",
      "p.id as process_id")
      .from("workflow as wf")
      .leftJoin("process as p", "wf.id", "p.workflow_id")
    for (const process of processes) {
      process.state = await this.getLastStateByProcess(process.process_id);
    }
    return processes;
  }

  async _create(process) {
    await this._db.transaction(async trx => {
      const state = process.state;
      delete process["state"];
      await this._db(this._table).transacting(trx).insert(process);
      if (state) {
        await this._db(this._state_table).transacting(trx).insert(state);
      }
    });
  }

  async _update(process_id, process) {
    const state = process.state;
    await this._db(this._state_table).insert(state);
  }

  _getTasks(filters) {
    return this._db.select(
      "w.name as workflow_name",
      "w.blueprint_spec as blueprint_spec",
      "p.id as process_id",
      "ps.status as process_status",
      "ps.created_at as process_last_update",
      "ps.step_number as process_step_number",
      "ps.node_id as current_node_id",
      "ps.bag as bag")
      .from("process_state as ps")
      .leftJoin("process as p", "ps.process_id", "p.id")
      .leftJoin("workflow as w", "p.workflow_id", "w.id")
      .modify((builder) => {
        if (filters) {
          if (filters.workflow_id) {
            builder.where({"w.id": filters.workflow_id});
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
    return await this._db(this._table)
                     .where("status", "started");
  }

  async getCompletedActivityManagers() {
    return await this._db(this._table)
                     .where("status", "completed");
  }

  async getActivityDataFromStatus(status, filters) {
    return await this._db
        .select(
            'am.id',
            'am.created_at',
            'am.type',
            'am.process_state_id',
            'am.props',
            'am.parameters',
            'am.status as activity_status',
            'ps.process_id',
            'ps.step_number',
            'ps.node_id',
            'ps.next_node_id',
            'ps.bag',
            'ps.external_input',
            'ps.error',
            'ps.status as process_status',
            'p.workflow_id',
            'p.blueprint_spec',
            'wf.name as workflow_name',
            'wf.description as workflow_description',
        )
        .from('activity_manager AS am')
        .rightJoin('process_state AS ps', 'am.process_state_id', 'ps.id')
        .rightJoin('process AS p', 'ps.process_id', 'p.id')
        .rightJoin('workflow AS wf', 'p.workflow_id', 'wf.id')
        .where('am.status', '=', status)
        .modify((builder) => {
          if (filters) {
            if (filters.workflow_id) {
              builder.where({"wf.id": filters.workflow_id});
            }
            if (filters.process_id) {
              builder.where({"p.id": filters.process_id});
            }
            if (filters.status) {
              builder.where({"am.status": filters.status});
            }
            if (filters.type) {
              builder.where({"am.type": filters.type});
            }
          }
        });
  }

  async getActivityDataFromId(obj_id) {
    return await this._db
        .select(
            'am.id',
            'am.created_at',
            'am.type',
            'am.process_state_id',
            'am.props',
            'am.parameters',
            'am.status as activity_status',
            'ps.process_id',
            'ps.step_number',
            'ps.node_id',
            'ps.next_node_id',
            'ps.bag',
            'ps.external_input',
            'ps.error',
            'ps.status as process_status',
            'p.workflow_id',
            'p.blueprint_spec',
            'wf.name as workflow_name',
            'wf.description as workflow_description'
        )
        .from('activity_manager AS am')
        .rightJoin('process_state AS ps', 'am.process_state_id', 'ps.id')
        .rightJoin('process AS p', 'ps.process_id', 'p.id')
        .rightJoin('workflow AS wf', 'p.workflow_id', 'wf.id')
        .where('am.id', '=', obj_id)
        .first();
  }

  async getProcessId(process_state_id) {
    return await this._db
        .select('process_id')
        .from('process_state')
        .where('id', '=', process_state_id)
        .first();
  }

  async getActivities(activity_manager_id) {
    return await this._db
                     .select()
                     .from(this._activity_table)
                     .where("activity_manager_id", activity_manager_id);
  }
}

class ActivityKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Activity, "activity");
  }
}

module.exports = {
  KnexPersist: KnexPersist,
  WorkflowKnexPersist: WorkflowKnexPersist,
  PackagesKnexPersist: PackagesKnexPersist,
  ProcessKnexPersist: ProcessKnexPersist,
  ActivityManagerKnexPersist: ActivityManagerKnexPersist,
  ActivityKnexPersist: ActivityKnexPersist
};
