const _ = require("lodash");
const bpu = require("../core/utils/blueprint");
const { Lane } = require("../core/workflow/lanes");
const { Workflow } = require("../core/workflow/workflow");
const { Blueprint } = require("../core/workflow/blueprint");
const { Process } = require("../core/workflow/process");
const { Packages } = require("../core/workflow/packages");
const { PersistorProvider } = require("../core/persist/provider");
const { ProcessStatus } = require("../core/workflow/process_state");
const { ActivityManager } = require("../core/workflow/activity_manager");
const { ActivityStatus } = require("../core/workflow/activity");
const { setProcessStateNotifier, setActivityManagerNotifier } = require("../core/notifier_manager");
const { addSystemTaskCategory } = require("../core/utils/node_factory");
const process_manager = require("../core/workflow/process_manager");

class Engine {
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

  constructor(persist_mode, persist_args) {
    if (Engine.instance) {
      return Engine.instance;
    }
    PersistorProvider.getPersistor(persist_mode, persist_args);
    Engine.instance = this;
  }

  setProcessStateNotifier(process_state_notifier) {
    setProcessStateNotifier(process_state_notifier);
  }

  setActivityManagerNotifier(activity_manager_notifier) {
    setActivityManagerNotifier(activity_manager_notifier);
  }

  addCustomSystemCategory(extra_system_tasks) {
    addSystemTaskCategory(extra_system_tasks)
  }

  async fetchAvailableActivitiesForActor(actor_data, filters = null) {
    return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.STARTED,
                                                                 actor_data,
                                                                 filters);
  }

  async fetchDoneActivitiesForActor(actor_data, filters = null) {
    return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.COMPLETED,
                                                                 actor_data,
                                                                 filters);
  }

  async fetchAvailableActivityForProcess(process_id, actor_data) {
    return await ActivityManager.fetchActivityForProcess(process_id,
                                                         actor_data,
                                                         ActivityStatus.STARTED);
  }

  async fetchActivityManager(activity_manager_id, actor_data) {
    return await ActivityManager.fetch(activity_manager_id, actor_data);
  }

  async beginActivity(process_id, actor_data) {
    const activity_manager = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
    return await activity_manager.beginActivity();
  }

  async commitActivity(process_id, actor_data, external_input) {
    try {
      const activity_manager = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
      return await activity_manager.commitActivity(process_id, actor_data, external_input);
    } catch (err) {
      return {error: err};
    }
  }

  async pushActivity(process_id, actor_data) {
    try{
      const activity_manager = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
      const [is_completed, payload] = await activity_manager.pushActivity(process_id);
      if(is_completed) {
        const process = await Process.fetch(process_id);
        return await process.run(actor_data, {activities: payload});
      }
      return undefined;
    } catch (err) {
      return {error: err};
    }
  }

  async submitActivity(activity_manager_id, actor_data, external_input) {
    try {
      let activity_manager_data = await ActivityManager.fetch(activity_manager_id, actor_data);
      if (activity_manager_data) {
        const activity_manager = ActivityManager.deserialize(activity_manager_data);
        await activity_manager.commitActivity(activity_manager_data.process_id, actor_data, external_input);
        const [is_completed, activities] = await activity_manager.pushActivity(activity_manager_data.process_id);
        let process_promise;
        if (is_completed && activity_manager_data.type !== 'notify') {
          const process = await Process.fetch(activity_manager_data.process_id);
          process_promise = process.run(actor_data, { activities: activities });
        } else {
          process_promise = Process.fetch(activity_manager_data.process_id);
        }
        return {
          processPromise: process_promise
        };
      } else {
        return { error: "Activity manager not found" };
      }
    } catch (error) {
      return { error: error };
    }
  }

  async createProcessByWorkflowName(workflow_name, actor_data, initial_bag = {}) {
    return process_manager.createProcessByWorkflowName(workflow_name, actor_data, initial_bag);
  }

  async createProcess(workflow_id, actor_data, initial_bag = {}) {
    const workflow = await this.fetchWorkflow(workflow_id);
    if (workflow) {
      return await workflow.createProcess(actor_data, initial_bag);
    }
    return undefined;
  }

  async runProcess(process_id, actor_data, external_input)  {
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

  async abortProcess(process_id, actor_data) {
    const process = await Process.fetch(process_id);
    if (process) {
      return await process.abort(actor_data);
    }
    return undefined;
  }

  async setProcessState(process_id, actor_data, process_state_data) {
    const process = await Process.fetch(process_id);
    if (process) {
      return await process.setState(actor_data, process_state_data);
    }
    return undefined;
  }

  async saveWorkflow(name, description, blueprint_spec) {
    return await new Workflow(name, description, blueprint_spec).save();
  }

  async fetchWorkflow(workflow_id) {
    return await Workflow.fetch(workflow_id);
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
}

module.exports = {
  Engine: Engine
};
