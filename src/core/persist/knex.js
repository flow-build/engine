const { Packages } = require("../workflow/packages");
const { ActivityManager } = require("../workflow/activity_manager");
const { Activity } = require("../workflow/activity");
const { Timer } = require("../workflow/timer");
const { Trigger } = require("../workflow/trigger");
const { Target } = require("../workflow/target");
const { Switch } = require("../workflow/switch");
const { v1: uuid } = require("uuid");

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

class TriggerKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Trigger, "trigger");
  }

  async getByProcessId(id) {
    return await this._db.select("*").from(this._table).where("process_id", id);
  }

  async getTriggerEvents(process_id, family) {
    if(family.includes('trigger')) {
      return this._db
      .select(
        "tr.id",
        "tr.created_at",
        "tr.signal",
        "tr.process_id",
        "tr.active",
        "tr.input",
        "tr.actor_data",
        "tt.resolved",
        "tt.target_process_id",
        "ta.id as target_id",
        "ta.created_at as target_created_at",
        "ta.signal as target_signal",
        "ta.resource_type as target_resource_type",
        "ta.resource_id as target_resource_id",
        "ta.active as target_active"
      )
      .from("trigger as tr")
      .join("trigger_target as tt", "tr.id", "tt.trigger_id")
      .join("target as ta", "tt.target_id", "ta.id")
      .where("tr.process_id", process_id)
      .then((resp) => {
        return resp.reduce((acc, item) => {
          const item_target = {
            id: item.target_id,
            created_at: item.target_created_at,
            resolved: item.resolved,
            process_id: item.target_process_id,
            signal: item.target_signal,
            resource_type: item.target_resource_type,
            resource_id: item.target_resource_id,
            active: item.target_active,
          };
          const found_trigger = acc.find((tr) => tr.id === item.id)
          if(found_trigger) {
            found_trigger.targets.push(item_target);
            return acc;
          }
          acc.push({
            id: item.id,
            created_at: item.created_at,
            signal: item.signal,
            process_id: item.process_id,
            active: item.active,
            input: item.input,
            actor_data: item.actor_data,
            targets: [item_target],
          })
          return acc;
        }, [])
      });
    };
    return [];
  }

  async getTargetEvents(process_id, family) {
    if(family.includes('target')) {
      return this._db
      .select(
        "ta.id",
        "ta.created_at",
        "ta.signal",
        "ta.resource_type",
        "ta.resource_id",
        "ta.active",
        "tt.resolved",
        "tr.id as trigger_id",
        "tr.created_at as trigger_created_at",
        "tr.signal as trigger_signal",
        "tr.process_id as trigger_process_id",
        "tr.active as trigger_active",
        "tr.input as trigger_input",
        "tr.actor_data as trigger_actor_data",
      )
      .from("target as ta")
      .join("trigger_target as tt", "ta.id", "tt.target_id")
      .join("trigger as tr", "tt.trigger_id", "tr.id")
      .where("tt.target_process_id", process_id)
      .then((resp) => {
        return resp.reduce((acc, item) => {
          const item_trigger = {
            id: item.trigger_id,
            created_at: item.trigger_created_at,
            process_id: item.trigger_process_id,
            signal: item.trigger_signal,
            active: item.trigger_active,
            input: item.trigger_input,
            actor_data: item.trigger_actor_data,
          };
          const found_target = acc.find((ta) => ta.id === item.id)
          if(found_target) {
            found_target.triggers.push(item_trigger);
            return acc;
          }
          acc.push({
            id: item.id,
            created_at: item.created_at,
            signal: item.signal,
            resource_type: item.resource_type,
            resource_id: item.resource_id,
            active: item.active,
            triggers: [item_trigger],
          })
          return acc;
        }, [])
      });
    };
    return [];
  }

  async getEventDataByProcessId(process_id, filters = {}) {
    const family = filters?.family || [];

    const [triggers, targets] = await Promise.all([
      this.getTriggerEvents(process_id, family),
      this.getTargetEvents(process_id, family)
    ]);

    return {
      triggers,
      targets,
    };
  }
}

class TargetKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Target, "target");
    this._trigger_target_table = "trigger_target";
  }

  async getTargetedWorkflows(obj) {
    return await this._db
      .select(
        "wf.id",
        "wf.version"
      )
      .from("workflow AS wf")
      .where("wf.name", "=", 
        this._db
            .select(
              "wf.name"
            )
            .from("workflow AS wf")
            .where("wf.id", obj.resource_id)
      )
      .orderBy("version", "desc");
  }

  async getByWorkflowAndSignal(signal) {
    return await this._db
      .select("*")
      .from("target AS tg")
      .where("tg.signal", "=", signal)
      .first();
  }

  async saveByWorkflow(obj, ...args) {
    const [latestWorkflow] = await this.getTargetedWorkflows(obj);
    const registered_target = await this.getByWorkflowAndSignal(obj.signal)
    const is_update = registered_target && latestWorkflow && latestWorkflow.version > 1;
    if (is_update) {
      obj.id = registered_target.id
      await this._update(registered_target.id, obj, ...args);
      return "update";
    }
    await this._create(obj, ...args);
    return "create";
  }

  async saveSignalRelation(trx, obj) {
    if (trx) {
      return await this._db(this._trigger_target_table).transacting(trx).insert({
        ...obj,
        id: uuid()
      });
    } else {
      return await this._db(this._trigger_target_table).insert({
        ...obj,
        id: uuid()
      });
    }
  }

  async getSignalRelation(trx, target_id) {
    if (trx) {
      return await this._db.transacting(trx)
        .select("*")
        .from(this._trigger_target_table)
        .where("target_id", target_id);
    } else {
      return await this._db
        .select("*")
        .from(this._trigger_target_table)
        .where("target_id", target_id);
    }
  }

  async getActivityManagerByProcessStateId(process_state_id) {
    return await this._db
      .select("*")
      .from("activity_manager AS am")
      .where("am.process_state_id", "=", process_state_id)
      .first();
  }

  async getByProcessStateId(process_state_id) {
    return await this._db(this._table)
      .select("*")
      .where("process_state_id", "=", process_state_id)
      .first();
  }
}

class TriggerTargetKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Target, "trigger_target");
  }

  async getByTriggerId(id) {
    return await this._db.select("*").from(this._table).where("trigger_id", id);
  }
}

class SwitchKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Switch, "switch");
  }

  async getByWorkflowId(workflow_id, trx) {
    if (trx) {
      return await this._db(this._table).where("workflow_id", workflow_id).transacting(trx);
    } else {
      return await this._db(this._table).where("workflow_id", workflow_id);
    }
  }
}

module.exports = {
  KnexPersist: KnexPersist,
  PackagesKnexPersist: PackagesKnexPersist,
  ActivityManagerKnexPersist: ActivityManagerKnexPersist,
  ActivityKnexPersist: ActivityKnexPersist,
  TimerKnexPersist: TimerKnexPersist,
  TriggerKnexPersist: TriggerKnexPersist,
  TargetKnexPersist: TargetKnexPersist,
  TriggerTargetKnexPersist: TriggerTargetKnexPersist,
  SwitchKnexPersist: SwitchKnexPersist,
};
