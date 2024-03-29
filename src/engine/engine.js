const { Workflow } = require("../core/workflow/workflow");
const { Blueprint } = require("../core/workflow/blueprint");
const { Process } = require("../core/workflow/process");
const { ENGINE_ID } = require("../core/workflow/process_state");
const { Packages } = require("../core/workflow/packages");
const { PersistorProvider } = require("../core/persist/provider");
const { Timer } = require("../core/workflow/timer");
const { ActivityManager } = require("../core/workflow/activity_manager");
const { ActivityStatus } = require("../core/workflow/activity");
const { setProcessStateNotifier, setActivityManagerNotifier, setEventNodeNotifier } = require("../core/notifier_manager");
const { addSystemTaskCategory } = require("../core/utils/node_factory");
const process_manager = require("../core/workflow/process_manager");
const crypto_manager = require("../core/crypto_manager");
const startEventListener = require("../core/utils/eventEmitter");
const emitter = require("../core/utils/emitter");
const { createLogger } = require("../core/utils/logging");
const { ProcessStatus } = require("./../core/workflow/process_state");
const { validateTimeInterval } = require("../core/utils/ajvValidator");
const { validate: uuidValidate } = require("uuid");
const { readEnvironmentVariableAsBool, readEnvironmentVariableAsNumber } = require("../core/utils/environment");
const { engineHeartBeat } = require("./heartbeat/base");

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

  static set beat(beat) {
    Engine._beat = beat;
  }

  static get beat() {
    return Engine._beat;
  }

  constructor(persist_mode, persist_args, logger_level) {
    const heartBeat = readEnvironmentVariableAsBool("ENGINE_HEARTBEAT", true);
    createLogger(logger_level);
    if (Engine.instance) {
      startEventListener(emitter);
      return Engine.instance;
    }
    PersistorProvider.getPersistor(persist_mode, persist_args);
    this._db = persist_args;
    Engine.instance = this;
    this.emitter = emitter;
    if (heartBeat) {
      Engine.beat = engineHeartBeat;
      if (process.env.TIMER_BATCH && process.env.TIMER_BATCH > 0 && process.env.TIMER_QUEUE) {
        emitter.emit("ENGINE.CONTRUCTOR", "BOTH BATCH AND QUEUE ACTIVE", {
          batch: process.env.TIMER_BATCH,
          queue: process.env.TIMER_QUEUE,
        });
      }
      try {
        Engine.heart = Engine.setNextHeartBeat();
        emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT INITIALIZED", {});
      } catch (e) {
        emitter.emit("ENGINE.ERROR", "ERROR AT ENGINE", { error: e });
      }
    } else {
      emitter.emit("ENGINE.CONTRUCTOR", "HEARTBEAT NOT INITIALIZED", {});
    }
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
    }, readEnvironmentVariableAsNumber("HEART_BEAT", 1000));
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

  setEventNodeNotifier(event_node_notifier) {
    setEventNodeNotifier(event_node_notifier);
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
      return await ActivityManager.addTimeInterval(id, timeInterval);
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

  async fetchProcessStateHistory(process_id, filters = {}) {
    const process = await Process.fetch(process_id);
    if (process) {
      return await Process.fetchStateHistory(process_id, filters);
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

    await Blueprint.assert_is_valid(blueprint_spec);

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

    const timer = new Timer("Process", process.id);
    await timer.retrieve();

    if (timer._id) {
      emitter.emit("ENGINE.CONTINUE_PROCESS.TIMER", { active: false, resource_type: process_id });
      await timer.deactivate();
    }

    emitter.emit("ENGINE.CONTINUE_PROCESS.WORKS", { process_id });
    process.continue(result, actor_data);
    return undefined;
  }
}

module.exports = {
  Engine: Engine,
};
