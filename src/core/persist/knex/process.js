const { Process } = require("../../workflow/process");
const { ProcessState } = require("../../workflow/process_state");
const { Workflow } = require("../../workflow/workflow");
const { KnexPersist, ExtraFieldsKnexPersist } = require("../knex");
const _ = require('lodash');

class ProcessKnexPersist extends KnexPersist {
  constructor(db) {
    super(db, Process, "process");
    this._state_class = ProcessState;
    this._state_table = "process_state";
  }

  async get(id) {
    return this._db.transaction(async (trx) => {
      const query = this._db
        .select("*")
        .from(this._table)
        .leftJoin("extra_fields AS ef", function() {
          this
            .on("process.id", "=", "ef.entity_id")
            .onIn("ef.entity_name", ["process"])
        })
        .where({ id })
        .first();
      let process;
      if (this.SQLite) {
        process = await query;
      } else {
        process = await query.transacting(trx);
      }
      if (process) {
        let state;
        let workflow;
        if (this.SQLite) {
          workflow = await Workflow.fetch(process.workflow_id);
          state = await this.getLastStateByProcess(id);
        } else {
          workflow = await Workflow.fetch(process.workflow_id, trx);
          state = await this.getLastStateByProcess(id).transacting(trx);
        }
        return {
          ...process,
          ...{ workflow_name: workflow._name, workflow_version: workflow._version, latest_version: workflow._latest },
          ...{ state: state },
        };
      }
      return undefined;
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
          if (filters.workflow_id) {
            builder.where({ workflow_id: filters.workflow_id });
          }
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

  async delete(id) {
    //todo trx
    try {
      return this._db.transaction(async (trx) => {
        if (this.SQLite) {
          await this._db(this._state_table).where("process_id", id).del();
          return await this._db(this._table).del();
        } else {
          await this._db(this._state_table).transacting(trx).where("process_id", id).del();
          return await this._db(this._table).transacting(trx).del();
        }
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
    return this._db.transaction(async (trx) => {
      if (this.SQLite) {
        await this._db(this._state_table).del();
        return this._db(this._table).del();
      } else {
        await this._db(this._state_table).transacting(trx).del();
        return this._db(this._table).transacting(trx).del();
      }
    });
  }

  getStateHistoryByProcess(id) {
    return this._db.select("*").from(this._state_table).where("process_id", id).orderBy("step_number", "desc");
  }

  getLastStateByProcess(id, trx = false) {
    const query = this._db
      .select(`${this._state_table}.*`)
      .from(this._table)
      .innerJoin(this._state_table, "process_state.id", "current_state_id")
      .where("process.id", id)
      .first();
    if(trx) {
      return query.transacting(trx);
    }
    return query;
  }

  async getLastStepNumber(id, trx = false) {
    const query = this._db(this._state_table).max("step_number").where("process_id", id).first();
    let result;
    if(trx) {
      result = await query.transacting(trx);
    } else {
      result = await query;
    }
    const count = Number(result.max);
    return count;
  }

  async getTasks(filters) {
    return this._getTasks(filters);
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
            builder.where("p.created_at", ">=", new Date(filters.start_date).toISOString());
          }

          if (filters.end_date) {
            builder.where("p.created_at", "<=", new Date(filters.end_date).toISOString());
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
      const { extra_fields } = process;
      delete process.extra_fields;

      if (extra_fields) {
        await new ExtraFieldsKnexPersist(this._db)
          ._create({
            entity_id: process.id,
            entity_name: "process",
            extra_fields
          });
      }

      await this._db.transaction(async (trx) => {
        const state = process.state;
        delete process["state"];

        if (this.SQLite){
          process.blueprint_spec = JSON.stringify(process.blueprint_spec);

          state.bag = JSON.stringify(state.bag);
          state.external_input = JSON.stringify(state.external_input);
          state.result = JSON.stringify(state.result);
          state.actor_data = JSON.stringify(state.actor_data);

          await this._db(this._table).insert(process);

          if (state) {
            await this._db(this._state_table).insert(state);
          }
        } else {
          await this._db(this._table).transacting(trx).insert(process);

          if (state) {
            await this._db(this._state_table).transacting(trx).insert(state);
          }
        }
      });
    } catch (e) {
      emitter.emit("KNEX.CREATE_PROCESS_ERROR", `Unable to create Process with PID [${this.id}]`, {
        error: e,
        process_id: this.id,
      });
    }
  }

  async _update(id, process, trx = false) {
    const state = process.state;
    delete process["state"];
    delete process["extra_fields"];

    if (this.SQLite){
      process.blueprint_spec = JSON.stringify(process.blueprint_spec);

      state.bag = JSON.stringify(state.bag);
      state.external_input = JSON.stringify(state.external_input);
      state.result = JSON.stringify(state.result);
      state.actor_data = JSON.stringify(state.actor_data);

      await this._db(this._state_table).insert(state);
      await this._db(this._table).where("id", id).update(process);
      return;
    }

    if (trx) {
      await trx(this._state_table).insert(state);
      await trx(this._table).where("id", id).update(process);
    } else {
      try {
        await this._db.transaction(async (trx) => {
          await this._db(this._state_table).insert(state).transacting(trx);
          await this._db(this._table).where("id", id).update(process).transacting(trx);
        });
      } catch (e) {
        emitter.emit("KNEX.UPDATE_PROCESS_ERROR", `Unable to update Process with PID [${id}]`, {
          error: e,
          process_id: id,
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

module.exports = {
  ProcessKnexPersist: ProcessKnexPersist,
};
