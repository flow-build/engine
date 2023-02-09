require("dotenv").config();
const _ = require("lodash");
const { Workflow } = require("../core/workflow/workflow");
const { Blueprint } = require("../core/workflow/blueprint");
const { Process } = require("../core/workflow/process");
const { ENGINE_ID } = require("../core/workflow/process_state");
const { Packages } = require("../core/workflow/packages");
const { PersistorProvider } = require("../core/persist/provider");
const { Timer } = require("../core/workflow/timer");
const { Trigger } = require("../core/workflow/trigger");
const { Target } = require("../core/workflow/target");
const { Switch } = require("../core/workflow/switch");
const { ActivityManager } = require("../core/workflow/activity_manager");
const { ActivityStatus } = require("../core/workflow/activity");
const { setProcessStateNotifier, setActivityManagerNotifier } = require("../core/notifier_manager");
const { addSystemTaskCategory, addNodesBlackList } = require("../core/utils/node_factory");
const process_manager = require("../core/workflow/process_manager");
const crypto_manager = require("../core/crypto_manager");
const startEventListener = require("../core/utils/eventEmitter");
const emitter = require("../core/utils/emitter");
const { createLogger } = require("../core/utils/logging");
const { ProcessStatus } = require("./../core/workflow/process_state");
const { validateTimeInterval } = require("../core/utils/ajvValidator");
const { validate: uuidValidate } = require("uuid");
const { isEmpty } = require("lodash");

function getActivityManagerFromData(activity_manager_data) {
  const activity_manager = ActivityManager.deserialize(activity_manager_data);
  activity_manager.activities = activity_manager_data.activities;
  return activity_manager;
}

class Engine {
  static get event_emitter() {
    return emitter;
  }

  static get instance() {
    return Engine._instance;
  }

  static set instance(instance) {
    Engine._instance = instance;
  }

  static get persistor() {
    return Engine._persistor;
  }

  static set persistor(instance) {
    Engine._persistor = instance;
  }

  static set heart(h) {
    Engine._heart = h;
  }

  static get heart() {
    return Engine._heart;
  }

  constructor(persist_mode, persist_args, logger_level) {
    const heartBeat = process.env.ENGINE_HEARTBEAT || true;
    createLogger(logger_level);
    if (Engine.instance) {
      startEventListener(emitter);
      return Engine.instance;
    }
    PersistorProvider.getPersistor(persist_mode, persist_args);
    this._db = persist_args;
    Engine.instance = this;
    this.emitter = emitter;
    if (heartBeat === true || heartBeat === "true") {
      try {
        const beatMode = process.env.BEAT_MODE || 'parallel';
        const initialBeat = beatMode === 'parallel' ? 'ALL' : 'ORPHAN_PROCESSES';
        Engine.heart = Engine.setNextHeartBeat(beatMode, initialBeat);
        emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT INITIALIZED", {});
      } catch (e) {
        emitter.emit("ENGINE.ERROR", "ERROR AT ENGINE SUPER", { error: e });
      }
    } else {
      emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT NOT INITIALIZED", {});
    }
  }

  static async resolveOrphanProcesses(ORPHAN_BATCH) {
    const db = Process.getPersist()._db;
    const orphan_process = await db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.ORPHANS_FETCHING", `FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH [${ORPHAN_BATCH}]`);
        const locked_orphans = await trx("process")
          .select("process.*")
          .join("process_state", "process_state.id", "process.current_state_id")
          .fullOuterJoin("switch", "switch.workflow_id", "process.workflow_id")
          .where("process.current_status", "running")
          .andWhere(function() {
            this.whereNull("switch").orWhere(function() {
              this.whereNot("switch.active", true).orWhere(function() {
                this.where("switch.active", true).andWhere("switch.node_id", "process_state.next_node_id")
              })
            })
          })
          .limit(ORPHAN_BATCH)
          .forUpdate("process", "process_state")
          .skipLocked();
        emitter.emit("ENGINE.ORPHANS_FETCHED", `  FETCHED [${locked_orphans.length}] ORPHANS ON HEARTBEAT`, {
          orphans: locked_orphans.length,
        });
        return await Promise.all(
          locked_orphans.map(async (orphan) => {
            emitter.emit("ENGINE.ORPHAN_FETCHING", `  FETCHING PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, {
              process_id: orphan.id,
            });
            orphan.state = await trx("process_state")
              .select()
              .where("id", orphan.current_state_id)
              .where("engine_id", "!=", ENGINE_ID)
              .forUpdate()
              .noWait()
              .first();
            emitter.emit("ENGINE.ORPHAN_FETCHED", `  FETCHED PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, {
              process_id: orphan.id,
            });
            if (orphan.state) {
              return Process.deserialize(orphan);
            }
          })
        );
      } catch (e) {
        emitter.emit("ENGINE.ORPHANS.ERROR", "  ERROR FETCHING ORPHANS ON HEARTBEAT", { error: e });
        throw new Error(e);
      }
    });
    const continue_promises = orphan_process.map((process) => {
      if (process) {
        emitter.emit(
          "ENGINE.ORPHAN.CONTINUE",
          `    START CONTINUE ORPHAN PID [${process.id}] AND STATE [${process.state.id}] ON HEARTBEAT`,
          {
            process_id: process.id,
            process_state_id: process.state.id,
          }
        );
        return process.continue({}, process.state._actor_data);
      }
    });
    await Promise.all(continue_promises);
  }

  static async resolveOrphanProcessesSQLite(ORPHAN_BATCH) {
    const db = Process.getPersist()._db;
    let orphan_process;
    try {
      emitter.emit("ENGINE.ORPHANS_FETCHING", `FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH [${ORPHAN_BATCH}]`);
      const locked_orphans = await db("process")
        .select("process.*")
        .join("process_state", "process_state.id", "process.current_state_id")
        .fullOuterJoin("switch", "switch.workflow_id", "process.workflow_id")
        .where("process.current_status", "running")
        .andWhere(function() {
          this.whereNull("switch.active").orWhere(function() {
            this.whereNot("switch.active", 1).orWhere(function() {
              this.where("switch.active", 1).andWhere("switch.node_id", "process_state.next_node_id")
            })
          })
        })
        .limit(ORPHAN_BATCH);
      emitter.emit("ENGINE.ORPHANS_FETCHED", `  FETCHED [${locked_orphans.length}] ORPHANS ON HEARTBEAT`, {
        orphans: locked_orphans.length,
      });
      orphan_process = await Promise.all(
        locked_orphans.map(async (orphan) => {
          emitter.emit("ENGINE.ORPHAN_FETCHING", `  FETCHING PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, {
            process_id: orphan.id,
          });
          orphan.state = await trx("process_state")
            .select()
            .where("id", orphan.current_state_id)
            .where("engine_id", "!=", ENGINE_ID)
            .first();
          emitter.emit("ENGINE.ORPHAN_FETCHED", `  FETCHED PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, {
            process_id: orphan.id,
          });
          if (orphan.state) {
            return Process.deserialize(orphan);
          }
        })
      );
    } catch (e) {
      emitter.emit("ENGINE.ORPHANS.ERROR", "  ERROR FETCHING ORPHANS ON HEARTBEAT", { error: e });
      throw new Error(e);
    }
    const continue_promises = orphan_process.map((process) => {
      if (process) {
        emitter.emit(
          "ENGINE.ORPHAN.CONTINUE",
          `    START CONTINUE ORPHAN PID [${process.id}] AND STATE [${process.state.id}] ON HEARTBEAT`,
          {
            process_id: process.id,
            process_state_id: process.state.id,
          }
        );
        return process.continue({}, process.state._actor_data);
      }
    });
    await Promise.all(continue_promises);
  }

  static async resolveTimers(TIMER_BATCH) {
    await Timer.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.FETCHING_TIMERS", `  FETCHING TIMERS ON HEARTBEAT BATCH [${TIMER_BATCH}]`);
        const locked_timers = await trx("timer")
          .where("expires_at", "<", new Date())
          .andWhere("active", true)
          .limit(TIMER_BATCH)
          .forUpdate()
          .skipLocked();
        emitter.emit("ENGINE.TIMERS", `  FETCHED [${locked_timers.length}] TIMERS ON HEARTBEAT`, {
          timers: locked_timers.length,
        });
        await Promise.all(
          locked_timers.map((t_lock) => {
            emitter.emit("ENGINE.FIRING_TIMER", `  FIRING TIMER [${t_lock.id}] ON HEARTBEAT`, { timer_id: t_lock.id });
            const timer = Timer.deserialize(t_lock);
            return timer.run(trx);
          })
        );
      } catch (e) {
        throw new Error(e);
      }
    });
  }

  static async resolveTimersSQLite(TIMER_BATCH) {
    const db = Timer.getPersist()._db;
    try {
      emitter.emit("ENGINE.FETCHING_TIMERS", `  FETCHING TIMERS ON HEARTBEAT BATCH [${TIMER_BATCH}]`);
      const locked_timers = await db("timer")
          .where("expires_at", "<", new Date().toISOString())
          .andWhere("active", 1)
          .limit(TIMER_BATCH);
      emitter.emit("ENGINE.TIMERS", `  FETCHED [${locked_timers.length}] TIMERS ON HEARTBEAT`, {
        timers: locked_timers.length,
      });
      await Promise.all(
        locked_timers.map((t_lock) => {
          emitter.emit("ENGINE.FIRING_TIMER", `  FIRING TIMER [${t_lock.id}] ON HEARTBEAT`, { timer_id: t_lock.id });
          const timer = Timer.deserialize(t_lock);
          return timer.run();
        })
      );
    } catch (e) {
      throw new Error(e);
    }
  }

  static async resolveTriggers(TRIGGER_BATCH) {
    await Process.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.SIGNAL_FETCHING", `FETCHING SIGNAL PROCESSES ON HEARTBEAT BATCH [${TRIGGER_BATCH}]`);
        const signals = await trx("trigger")
            .select("*")
            .where("active", true)
            .limit(TRIGGER_BATCH)
            .forUpdate()
            .skipLocked();
        return await Promise.all(signals.map((l_trigger) => {
          const trigger = Trigger.deserialize(l_trigger);
          return trigger.run(trx, this);
        }))
      } catch (e) {
        emitter.emit("ENGINE.SIGNAL.ERROR", "  ERROR FETCHING SIGNALS ON HEARTBEAT", { error: e });
      }
    });
  }

  static async resolveTriggersSQLite(TRIGGER_BATCH) {
    const db = Process.getPersist()._db;
    try {
      emitter.emit("ENGINE.SIGNAL_FETCHING", `FETCHING SIGNAL PROCESSES ON HEARTBEAT BATCH [${TRIGGER_BATCH}]`);
      const signals = await db("trigger")
          .select("*")
          .where("active", 1)
          .limit(TRIGGER_BATCH);
      return await Promise.all(signals.map((l_trigger) => {
        const trigger = Trigger.deserialize(l_trigger);
        return trigger.run(false, this)
      }))
    } catch (e) {
      emitter.emit("ENGINE.SIGNAL.ERROR", "  ERROR FETCHING SIGNALS ON HEARTBEAT", { error: e });
    }
  }

  static async resolveSwitches(SWITCH_BATCH) {
    await Process.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.SWITCH_FETCHING", `FETCHING SWITCH ON PROCESSES ON HEARTBEAT BATCH [${SWITCH_BATCH}]`);
        const switches = await trx("switch")
            .select("*")
            .where("active", true)
            .limit(SWITCH_BATCH)
            .forUpdate()
            .skipLocked();
        
        return await Promise.all(switches.map((l_switch) => {
          const switch_ = Switch.deserialize(l_switch);
          return switch_.validate(trx);
        }))
      } catch (e) {
        emitter.emit("ENGINE.SWITCHES.ERROR", "  ERROR FETCHING SWITCHES ON HEARTBEAT", { error: e });
      }
    });
  }

  static async resolveSwitchesSQLite(SWITCH_BATCH) {
    const db = Process.getPersist()._db;
    try {
      emitter.emit("ENGINE.SWITCH_FETCHING", `FETCHING SWITCH ON PROCESSES ON HEARTBEAT BATCH [${SWITCH_BATCH}]`);
      const switches = await db("switch")
          .select("*")
          .where("active", 1)
          .limit(SWITCH_BATCH);      
      return await Promise.all(switches.map((l_switch) => {
        const switch_ = Switch.deserialize(l_switch);
        return switch_.validate();
      }))
    } catch (e) {
      emitter.emit("ENGINE.SWITCHES.ERROR", "  ERROR FETCHING SWITCHES ON HEARTBEAT", { error: e });
    }
  }

  static async _beat(action = 'ALL') {
    const TIMER_BATCH = process.env.TIMER_BATCH || 40;
    const ORPHAN_BATCH = process.env.ORPHAN_BATCH || 10;
    const TRIGGER_BATCH = process.env.TRIGGER_BATCH || 10;
    const SWITCH_BATCH = process.env.SWITCH_BATCH || 10;
    const db = Process.getPersist()._db;
    const SQLite = db.context.client.config.client === "sqlite3";

    emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);

    if (SQLite) {
      switch(action) {
        case 'ORPHAN_PROCESSES':
          await Engine.resolveOrphanProcessesSQLite(ORPHAN_BATCH);
          break;
        case 'TIMERS':
          await Engine.resolveTimersSQLite(TIMER_BATCH);
          break;
        case 'TRIGGERS':
          await Engine.resolveTriggersSQLite(TRIGGER_BATCH);
          break;
        case 'SWITCHES':
          await Engine.resolveSwitchesSQLite(SWITCH_BATCH);
          break;
        default:
          await Engine.resolveOrphanProcessesSQLite(ORPHAN_BATCH);
          await Engine.resolveTimersSQLite(TIMER_BATCH);
          await Engine.resolveTriggersSQLite(TRIGGER_BATCH);
          await Engine.resolveSwitchesSQLite(SWITCH_BATCH);
          break;
      }
    } else {
      switch(action) {
        case 'ORPHAN_PROCESSES':
          await Engine.resolveOrphanProcesses(ORPHAN_BATCH);
          break;
        case 'TIMERS':
          await Engine.resolveTimers(TIMER_BATCH);
          break;
        case 'TRIGGERS':
          await Engine.resolveTriggers(TRIGGER_BATCH);
          break;
        case 'SWITCHES':
          await Engine.resolveSwitches(SWITCH_BATCH);
          break;
        default:
          await Engine.resolveOrphanProcesses(ORPHAN_BATCH);
          await Engine.resolveTimers(TIMER_BATCH);
          await Engine.resolveTriggers(TRIGGER_BATCH);
          await Engine.resolveSwitches(SWITCH_BATCH);
          break;
      }
    }
  }

  static setNextHeartBeat(beatMode = 'parallel', action = 'ALL') {
    const beatConfiguration = [
      {
        action: 'ORPHAN_PROCESSES',
        next: 'TIMERS'
      },
      {
        action: 'TIMERS',
        next: 'TRIGGERS'
      },
      {
        action: 'TRIGGERS',
        next: 'SWITCHES'
      },
      {
        action: 'SWITCHES',
        next: 'ORPHAN_PROCESSES'
      },
      {
        action: 'ALL',
        next: 'ALL'
      },
    ];

    return setTimeout(async () => {
      try {
        await Engine._beat(action);
      } catch (e) {
        emitter.emit("ENGINE.HEART.ERROR", `HEART FAILURE @ ENGINE_ID [${ENGINE_ID}]`, {
          engine_id: ENGINE_ID,
          error: e,
        });
      } finally {
        const actionObj = beatMode === 'sequential' ? beatConfiguration.find(b => b.action === action) : { next: 'ALL' };
        Engine.heart = Engine.setNextHeartBeat(beatMode, actionObj.next);
        emitter.emit("ENGINE.NEXT", "NEXT HEARTBEAT SET");
      }
    }, process.env.HEART_BEAT || 1000);
  }

  static kill() {
    if (Engine.heart) clearTimeout(Engine.heart);
  }

  static async checkActorsPermission(activity_data_array, actor_data_array) {
    return ActivityManager.checkActorsPermission(activity_data_array, actor_data_array);
  }

  setProcessStateNotifier(process_state_notifier) {
    setProcessStateNotifier(process_state_notifier);
  }

  setActivityManagerNotifier(activity_manager_notifier) {
    setActivityManagerNotifier(activity_manager_notifier);
  }

  addCustomSystemCategory(extra_system_tasks) {
    addSystemTaskCategory(extra_system_tasks);
  }

  addNodesCategoriesBlackList(nodes_black_list) {
    addNodesBlackList(nodes_black_list);
  }

  buildCrypto(type, data) {
    return crypto_manager.buildCrypto(type, data);
  }

  setCrypto(crypto) {
    crypto_manager.setCrypto(crypto);
  }

  async fetchAvailableActivitiesForActor(actor_data) {
    const filters = await {
      current_status: [ProcessStatus.WAITING, ProcessStatus.RUNNING, ProcessStatus.DELEGATED, ProcessStatus.PENDING],
    };

    return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.STARTED, actor_data, filters);
  }

  async fetchDoneActivitiesForActor(actor_data, filters = null) {
    return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.COMPLETED, actor_data, filters);
  }

  async fetchAvailableActivityForProcess(process_id, actor_data) {
    return await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
  }

  async fetchActivityManager(activity_manager_id, actor_data) {
    return await ActivityManager.get(activity_manager_id, actor_data);
  }

  async addTimeInterval(id, timeInterval, resource_type) {
    validateTimeInterval({
      id: id,
      date: timeInterval,
      resource_type: resource_type,
    });

    let activity_manager = await this.fetchActivityManager(id);
    if (activity_manager) {
      return await ActivityManager.addTimeInterval(id, timeInterval, resource_type);
    } else {
      return {
        error: {
          errorType: "activityManager",
          message: "Activity manager not found",
        },
      };
    }
  }

  async setExpiredDate(id, date, resource_type) {
    const dateRegexp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    if (!date.match(dateRegexp)) {
      return {
        error: {
          errorType: "activityManager",
          message: "Date should be in YYYY-MM-DDThh:mm:ss format",
        },
      };
    }

    if (!(resource_type === "ActivityManager" || resource_type === "Process" || resource_type === "Mock")) {
      return {
        error: {
          errorType: "activityManager",
          message: "Invalid resource_type",
        },
      };
    }

    let activity_manager = await this.fetchActivityManager(id);
    if (activity_manager) {
      return await ActivityManager.setExpiredDate(id, date, resource_type);
    } else {
      return {
        error: {
          errorType: "activityManager",
          message: "Activity manager not found",
        },
      };
    }
  }

  async beginActivity(process_id, actor_data) {
    const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(
      process_id,
      actor_data,
      ActivityStatus.STARTED
    );
    if (activity_manager_data) {
      const activity_manager = getActivityManagerFromData(activity_manager_data);
      return await activity_manager.beginActivity();
    }
  }

  async commitActivity(process_id, actor_data, external_input) {
    try {
      const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(
        process_id,
        actor_data,
        ActivityStatus.STARTED
      );
      if (activity_manager_data) {
        const activity_manager = getActivityManagerFromData(activity_manager_data);
        return await activity_manager.commitActivity(
          process_id,
          actor_data,
          external_input,
          activity_manager._parameters.activity_schema
        );
      } else {
        return {
          error: {
            errorType: "activityManager",
            message: "Activity manager not found",
          },
        };
      }
    } catch (e) {
      return {
        error: {
          errorType: "commitActivity",
          message: e.message,
        },
      };
    }
  }

  async pushActivity(process_id, actor_data) {
    try {
      const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(
        process_id,
        actor_data,
        ActivityStatus.STARTED
      );
      if (activity_manager_data) {
        const activity_manager = getActivityManagerFromData(activity_manager_data);
        const [is_completed, payload] = await activity_manager.pushActivity(process_id);
        let processPromise;
        if (is_completed) {
          const result = await process_manager.notifyCompletedActivityManager(
            process_id,
            {
              actor_data,
              activities: payload,
            },
            activity_manager.parameters.next_step_number
          );
          if (result) {
            processPromise = result.process_promise;
          }
        } else {
          processPromise = Process.fetch(process_id);
        }
        return {
          processPromise,
        };
      } else {
        return {
          error: {
            errorType: "activityManager",
            message: "Activity manager not found",
          },
        };
      }
    } catch (e) {
      return {
        error: {
          errorType: "pushActivity",
          message: e.message,
        },
      };
    }
  }

  async submitActivity(activity_manager_id, actor_data, external_input, disable_target = true) {
    try {
      if(!uuidValidate(activity_manager_id)){
        throw new Error('invalid input syntax for type uuid');
      }
      let activity_manager_data = await ActivityManager.get(activity_manager_id, actor_data);
      if (activity_manager_data) {
        if (activity_manager_data.activity_status === "started") {
          const activity_manager = getActivityManagerFromData(activity_manager_data);
          try {
            await activity_manager.commitActivity(
              activity_manager_data.process_id,
              actor_data,
              external_input,
              activity_manager._parameters.activity_schema
            );
          } catch (e) {
            return {
              error: {
                errorType: "commitActivity",
                message: e.message,
              },
            };
          }
          const [is_completed, activities] = await activity_manager.pushActivity(activity_manager_data.process_id);
          
          if(disable_target) {
            const target = await Target.fetchTargetByProcessStateId(activity_manager_data.process_state_id);
            if(target && target.active) {
              target._active = false;
              await target.save()
            }
          }
          
          let process_promise;
          if (is_completed && activity_manager_data.type !== "notify") {
            const result = await process_manager.notifyCompletedActivityManager(
              activity_manager_data.process_id,
              {
                actor_data,
                activities: activities.map((activity) => (activity.serialize ? activity.serialize() : activity)),
              },
              activity_manager.parameters.next_step_number
            );
            if (result) {
              process_promise = result.process_promise;
            }
          } else {
            process_promise = Process.fetch(activity_manager_data.process_id);
          }
          return {
            processPromise: process_promise,
          };
        } else {
          return {
            error: {
              errorType: "submitActivity",
              message: "Submit activity unavailable",
            },
          };
        }
      } else {
        return {
          error: {
            errorType: "activityManager",
            message: "Activity manager not found",
          },
        };
      }
    } catch (e) {
      return {
        error: {
          errorType: "submitActivityUnknownError",
          message: e.message,
        },
      };
    }
  }

  async createProcessByWorkflowName(workflow_name, actor_data, initial_bag = {}) {
    return process_manager.createProcessByWorkflowName(workflow_name, actor_data, initial_bag);
  }

  async createProcess(workflow_id, actor_data, initial_bag = {}) {
    const workflow = await this.fetchWorkflow(workflow_id);
    if (workflow) {
      const created_process = await workflow.createProcess(actor_data, initial_bag);
      emitter.emit("PROCESS.EDGE.CREATED", `CREATED PROCESS OF [${workflow.name}] PID [${created_process.id}]`, {
        workflow_name: workflow.name,
        process_id: created_process.id,
      });
      return created_process;
    }
    return undefined;
  }

  async runProcess(process_id, actor_data, external_input) {
    return process_manager.runProcess(process_id, actor_data, external_input);
  }

  async fetchProcess(process_id) {
    return await Process.fetch(process_id);
  }

  async fetchProcessStateHistory(process_id) {
    const process = await Process.fetch(process_id);
    if (process) {
      return await Process.fetchStateHistory(process_id);
    }
    return undefined;
  }

  async fetchProcessList(filters = {}) {
    return await Process.fetchAll(filters);
  }

  async abortProcess(process_id) {
    const abort_result = await process_manager.abortProcess([process_id]);
    if (abort_result[0].value) {
      emitter.emit(
        "PROCESS.EDGE.ABORTED",
        `PROCESS ABORTED [${process_id}] OF [${abort_result[0].value.workflow_name}]`,
        {
          workflow_name: abort_result[0].value.workflow_name,
          process_id: process_id,
        }
      );
    }
    return abort_result[0].value;
  }

  async saveWorkflow(name, description, blueprint_spec, workflow_id = null, extra_fields = null) {
    if (workflow_id) {
      if (uuidValidate(workflow_id)) {
        const wf = await Workflow.fetch(workflow_id);
        if (wf)
          return {
            error: {
              errorType: "workflow",
              message: "workflow already exists",
            },
          };
      } else {
        return {
          error: {
            errorType: "workflow",
            message: "invalid workflow_id format",
          },
        };
      }
    }

    Blueprint.assert_is_valid(blueprint_spec);

    const workflow = await new Workflow(name, description, blueprint_spec, workflow_id, extra_fields).save();

    const target = Target.target_workflow_creation(workflow);
    if(target) {
      target._active = true;
      target.saveByWorkflow()
    }

    return workflow
  }

  async fetchWorkflow(workflow_id) {
    return await Workflow.fetch(workflow_id);
  }

  async fetchWorkflowByName(workflow_name, version = null) {
    return await Workflow.fetchWorkflowByName(workflow_name, version);
  }

  async findWorkflowByBlueprintHash(blueprint_hash) {
    return await Workflow.findWorkflowByBlueprintHash(blueprint_hash);
  }

  async validateBlueprint(blueprint_spec) {
    return await Blueprint.assert_is_valid(blueprint_spec);
  }

  async deleteWorkflow(workflow_id) {
    return await Workflow.delete(workflow_id);
  }

  async savePackage(name, description, code) {
    return await new Packages(name, description, code).save();
  }

  async fetchPackage(package_id) {
    return await Packages.fetch(package_id);
  }

  async deletePackage(package_id) {
    return await Packages.delete(package_id);
  }

  async fetchEventsByProcess(process_id, filters = {}) {
    return await Trigger.fetchEventDataByProcessId(process_id, filters);
  }

  async continueProcess(process_id, actor_data, result = {}) {
    if (!uuidValidate(process_id)) {
      const error = {
        error: {
          errorType: "continueProcessInvalidType",
          message: "Invalid process_id type",
        },
      };

      emitter.emit("ENGINE.CONTINUE_PROCESS.ERROR", error);

      return error;
    }

    const process = await Process.fetch(process_id);

    if (process.status !== ProcessStatus.PENDING) {
      const error = {
        error: {
          errorType: "continueProcessInvalidStatus",
          message: "This process isn't PENDING status.",
        },
      };

      emitter.emit("ENGINE.CONTINUE_PROCESS.ERROR", error);

      return error;
    }

    const timer_db = this._db("timer");
    const timer = await timer_db.where({ resource_id: process.id }).first();

    if (!isEmpty(timer)) {
      emitter.emit("ENGINE.CONTINUE_PROCESS.TIMER", { active: false, resource_type: process_id });
      await timer_db.update({ active: false }).where({ resource_id: process.id });
    }

    emitter.emit("ENGINE.CONTINUE_PROCESS.WORKS", { process_id });
    process.continue(result, actor_data);
    return undefined;
  }
}

module.exports = {
  Engine: Engine,
};
