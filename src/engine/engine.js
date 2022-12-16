require("dotenv").config();
const _ = require("lodash");
const nodes_mobile = require("../core/workflow/nodes_mobile");
const nodes = require("../core/workflow/nodes/index");
const { Workflow } = require("../core/workflow/workflow");
const { Blueprint } = require("../core/workflow/blueprint");
const { Process } = require("../core/workflow/process");
const { ENGINE_ID } = require("../core/workflow/process_state");
const { Packages } = require("../core/workflow/packages");
const { PersistorProvider } = require("../core/persist/provider");
const { Timer } = require("../core/workflow/timer");
const { ActivityManager } = require("../core/workflow/activity_manager");
const { ActivityStatus } = require("../core/workflow/activity");
const { setProcessStateNotifier, setActivityManagerNotifier } = require("../core/notifier_manager");
const { addSystemTaskCategory , reset, addMobileWhiteList} = require("../core/utils/node_factory");
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

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

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

  constructor(persist_mode, persist_args, logger_level, availableNodes = null, whiteList = null) {
    const heartBeat = process.env.ENGINE_HEARTBEAT || true;
    createLogger(logger_level);
    if (Engine.instance) {
      startEventListener(emitter);
      return Engine.instance;
    }
    PersistorProvider.getPersistor(persist_mode, persist_args);
    if (whiteList) { 
      addMobileWhiteList(whiteList);
    }
    if (availableNodes) {
      addSystemTaskCategory(availableNodes);
    }
    this._db = persist_args;
    Engine.instance = this;
    this.emitter = emitter;
    if (heartBeat === true || heartBeat === "true") {
      try {
        Engine.heart = Engine.setNextHeartBeat();
        emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT INITIALIZED", {});
      } catch (e) {
        emitter.emit("ENGINE.ERROR", "ERROR AT ENGINE SUPER", { error: e });
      }
    } else {
      emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT NOT INITIALIZED", {});
    }
  }

  static async _beat() {
    const TIMER_BATCH = process.env.TIMER_BATCH || 40;
    const ORPHAN_BATCH = process.env.ORPHAN_BATCH || 10;
    emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);
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
    const orphan_process = await Process.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.ORPHANS_FETCHING", `FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH [${ORPHAN_BATCH}]`);
        const locked_orphans = await trx("process")
          .select("process.*")
          .join("process_state", "process_state.id", "process.current_state_id")
          .where("engine_id", "!=", ENGINE_ID)
          .where("current_status", "running")
          .limit(ORPHAN_BATCH)
          .forUpdate()
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

  static setNextHeartBeat() {
    return setTimeout(async () => {
      try {
        await Engine._beat();
      } catch (e) {
        emitter.emit("ENGINE.HEART.ERROR", `HEART FAILURE @ ENGINE_ID [${ENGINE_ID}]`, {
          engine_id: ENGINE_ID,
          error: e,
        });
      } finally {
        Engine.heart = Engine.setNextHeartBeat();
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

  buildCrypto(type, data) {
    return crypto_manager.buildCrypto(type, data);
  }

  setCrypto(crypto) {
    crypto_manager.setCrypto(crypto);
  }

  async fetchAvailableActivitiesForActor(actor_data) {
    const filters = {
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

  async submitActivity(activity_manager_id, actor_data, external_input) {
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

  async saveWorkflow(name, description, blueprint_spec, workflow_id = null) {
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

    return await new Workflow(name, description, blueprint_spec, workflow_id).save();
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

class PostgresEngine extends Engine {
  static get default_nodes() {
    return nodes;
  }

  static get reset_nodes(){
    return reset();
  }

  static get event_emitter(){
    return emitter;
  }

  static get instance() {
    return PostgresEngine._instance;
  }

  static set instance(instance) {
    PostgresEngine._instance = instance;
  }

  static get persistor() {
    return PostgresEngine._persistor;
  }

  static set persistor(instance) {
    PostgresEngine._persistor = instance;
  }

  static set heart(h) {
    PostgresEngine._heart = h;
  }

  static get heart() {
    return PostgresEngine._heart;
  }

  constructor(persist_mode, persist_args, logger_level, availableNodes = null, whiteList = null) {
    super(persist_mode, persist_args, logger_level, availableNodes, whiteList);
    try {
      PostgresEngine.heart = PostgresEngine.setNextHeartBeat();
    } catch (e) {
      emitter.emit("ENGINE.ERROR", "ERROR AT ENGINE POSTGRES", { error: e });
    }
  }

  static setNextHeartBeat() {
    return setTimeout(async () => {
      try {
        await PostgresEngine._beat();
      } catch (e) {
        emitter.emit("ENGINE.HEART.ERROR", `HEART FAILURE @ ENGINE_ID [${ENGINE_ID}] ${JSON.stringify({ e })}`, {
            engine_id: ENGINE_ID,
            error: e
        });
      } finally {
        PostgresEngine.heart = PostgresEngine.setNextHeartBeat();
        emitter.emit("ENGINE.NEXT", "NEXT HEARTBEAT SET");
      }
    }, env.HEART_BEAT || 1000);
  }

  static kill() {
    if (PostgresEngine.heart)
      clearTimeout(PostgresEngine.heart);
  }

  static async _beat(){
    const TIMER_BATCH = process.env.TIMER_BATCH || 20;
    const ORPHAN_BATCH = process.env.ORPHAN_BATCH || 10;
    emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);
    const locked_timers = await Timer.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.FETCHING_TIMERS", `  FETCHING TIMERS ON HEARTBEAT BATCH [${TIMER_BATCH}]`);
        const locked_timers = await trx("timer")
          .where("expires_at", "<", new Date().toISOString())
          .andWhere("active", true)
          .limit(TIMER_BATCH)
          .forUpdate()
          .skipLocked();  
        return locked_timers;    
      } catch (e) {
        throw new Error(e);
      }
    });
    emitter.emit("ENGINE.TIMERS", `  FETCHED [${locked_timers.length}] TIMERS ON HEARTBEAT`,{ timers: locked_timers.length });
    await Promise.all(locked_timers.map((t_lock) => {
      emitter.emit("ENGINE.FIRING_TIMER", `  FIRING TIMER [${t_lock.id}] ON HEARTBEAT`, { timer_id: t_lock.id });
      const timer = Timer.deserialize(t_lock);
      return timer.run();
    }));
    const orphan_process = await Process.getPersist()._db.transaction(async (trx) => {
      try {
        emitter.emit("ENGINE.ORPHANS_FETCHING", `FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH [${ORPHAN_BATCH}]`);
        const locked_orphans = await trx("process")
          .select('process.*')
          .join('process_state', 'process_state.id', 'process.current_state_id')
          .where('engine_id', '!=', ENGINE_ID)
          .whereIn('current_status', ['running', 'unavailable'])
          .limit(ORPHAN_BATCH).forUpdate().skipLocked();
        emitter.emit("ENGINE.ORPHANS_FETCHED", `  FETCHED [${locked_orphans.length}] ORPHANS ON HEARTBEAT`,{ orphans: locked_orphans.length });
        return await Promise.all(locked_orphans.map(async (orphan) => {
          emitter.emit("ENGINE.ORPHAN_FETCHING", `  FETCHING PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, { process_id: orphan.id });
          orphan.state = await trx("process_state")
            .select().where("id", orphan.current_state_id)
            .where('engine_id', '!=', ENGINE_ID)
            .forUpdate().noWait()
            .first();
          emitter.emit("ENGINE.ORPHAN_FETCHED", `  FETCHED PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, { process_id: orphan.id });
          if (orphan.state) {
            return Process.deserialize(orphan);
          }
        }));
      } catch (e) {
        emitter.emit("ENGINE.ORPHANS.ERROR", "  ERROR FETCHING ORPHANS ON HEARTBEAT", { error: e });
        throw new Error(e);
      }
    });
      const continue_promises = orphan_process.map((process) => {
        if (process) {
          emitter.emit("ENGINE.ORPHAN.CONTINUE", `    START CONTINUE ORPHAN PID [${process.id}] AND STATE [${process.state.id}] ON HEARTBEAT`, {
            process_id: process.id,
            process_state_id: process.state.id
          });
          return process.continue({}, process.state._actor_data);
        }
      });
      await Promise.all(continue_promises);
  }
}

class SQLiteEngine extends Engine {
    static get default_nodes() {
      return nodes_mobile;
    }

    static get reset_nodes() {
      return reset();
    }

    static get event_emitter() {
      return emitter;
    }

    static get instance() {
      return SQLiteEngine._instance;
    }

    static set instance(instance) {
      SQLiteEngine._instance = instance;
    }

    static get persistor() {
      return SQLiteEngine._persistor;
    }

    static set persistor(instance) {
      SQLiteEngine._persistor = instance;
    }

    static set heart(h) {
      SQLiteEngine._heart = h;
    }

    static get heart() {
      return SQLiteEngine._heart;
    }

    constructor(persist_mode, persist_args, logger_level, availableNodes = null, whiteList = null) {
      super(persist_mode, persist_args, logger_level, availableNodes, whiteList);
    }

    static init(bgService, options) {
        try {
            SQLiteEngine.heart = SQLiteEngine.setNextHeartBeat(bgService, options);
        } catch (e) {
          emitter.emit("ENGINE.ERROR", "ERROR AT ENGINE SQLITE", { error: e });
        }
    }

    static setNextHeartBeat(bgService, options = {
        taskName: 'engine_beat',
        taskTitle: 'Background Service Start',
        taskDesc: 'SQLiteEngine Beat',
        taskIcon: {
            name: 'ic_launcher',
            type: 'mipmap',
        },
        parameters: {
            delay: 1000,
        },
    }) {
        return setTimeout(async () => {
            try {
                bgService.start(async (taskParams) => {
                    await SQLiteEngine._beat();
                    await sleep(taskParams.delay);
                }, options);
            } catch (e) {
                await bgService.stop()
                emitter.emit("ENGINE.HEART.ERROR", `HEART FAILURE @ ENGINE_ID [${ENGINE_ID}] ${JSON.stringify({ e })} `, {
                    engine_id: ENGINE_ID,
                    error: e
                });
            } finally {
                SQLiteEngine.heart = SQLiteEngine.setNextHeartBeat(bgService, options);
                emitter.emit("ENGINE.NEXT", "NEXT HEARTBEAT SET");
            }
        }, env.HEART_BEAT || 10000);
    }

    static kill() {
        if (SQLiteEngine.heart)
            clearTimeout(SQLiteEngine.heart);
    }

    static async _beat(){
        const TIMER_BATCH = env.TIMER_BATCH || 1
        const ORPHAN_BATCH = env.ORPHAN_BATCH || 1;
        emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);
        await Timer.getPersist()._db.transaction(async (trx) => {
            try {
                emitter.emit("ENGINE.FETCHING_TIMERS", `  FETCHING TIMERS ON HEARTBEAT BATCH [${TIMER_BATCH}]`);
                const locked_timers = await trx("timer")
                    .where("expires_at", "<", new Date().toISOString())
                    .andWhere("active", true)
                    .limit(TIMER_BATCH)
                emitter.emit("ENGINE.TIMERS", `  FETCHED [${locked_timers.length}] TIMERS ON HEARTBEAT`,{ timers: locked_timers.length });
                await Promise.all(locked_timers.map((t_lock) => {
                    emitter.emit("ENGINE.FIRING_TIMER", `  FIRING TIMER [${t_lock.id}] ON HEARTBEAT`, { timer_id: t_lock.id });
                    const timer = Timer.deserialize(t_lock);
                    return timer.run(trx);
                }));
            } catch (e) {
                throw new Error(e);
            }
        });
        const orphan_process = await Process.getPersist()._db.transaction(async (trx) => {
            try {
                emitter.emit("ENGINE.ORPHANS_FETCHING", `FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH [${ORPHAN_BATCH}]`);
                const locked_orphans = await trx("process")
                    .select('process.*')
                    .join('process_state', 'process_state.id', 'process.current_state_id')
                    .where('engine_id', '!=', ENGINE_ID)
                    .where("process.current_status", "running")
                    .limit(ORPHAN_BATCH)
                emitter.emit("ENGINE.ORPHANS_FETCHED", `  FETCHED [${locked_orphans.length}] ORPHANS ON HEARTBEAT`,{ orphans: locked_orphans.length });
                return await Promise.all(locked_orphans.map(async (orphan) => {
                    emitter.emit("ENGINE.ORPHAN_FETCHING",`  FETCHING PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, { process_id: orphan.id });
                    orphan.state = await trx("process_state")
                        .select().where("id", orphan.current_state_id)
                        .where('engine_id', '!=', ENGINE_ID)
                        .first();
                    emitter.emit("ENGINE.ORPHAN_FETCHED", `  FETCHED PS FOR ORPHAN [${orphan.id}] ON HEARTBEAT`, { process_id: orphan.id });
                    if (orphan.state) {
                        return Process.deserialize(orphan);
                    }
                }));
            } catch (e) {
                emitter.emit("ENGINE.ORPHANS.ERROR", "  ERROR FETCHING ORPHANS ON HEARTBEAT", { error: e });
                throw new Error(e);
            }
        });
        const continue_promises = orphan_process.map((process) => {
            if (process) {
                emitter.emit("ENGINE.ORPHAN.CONTINUE", `    START CONTINUE ORPHAN PID [${process.id}] AND STATE [${process.state.id}] ON HEARTBEAT`, {
                    process_id: process.id,
                    process_state_id: process.state.id
                });
                return process.continue({}, process.state._actor_data);
            }
        });
        await Promise.all(continue_promises);
    }
}

module.exports = {
  Engine: process.env.NODE_ENV === "sqlite" ? SQLiteEngine : PostgresEngine,
};
