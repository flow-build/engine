const _ = require('lodash');
const assert = require("assert");
const { PersistorSingleton } = require("../persist/persist");
const { Workflow } = require("../workflow/workflow");
const { Packages } = require("../workflow/packages");
const { Process } = require("../workflow/process");
const { ProcessState } = require("../workflow/process_state");
const { ActivityManager } = require("../workflow/activity_manager");
const { Activity } = require("../workflow/activity");

class MemoryPersist {

  constructor(class_) {
    this._store = {};
    this._class = class_;
  }

  async save(obj) {
    if (obj.id in this._store) {
      await this._update(obj.id, obj);
      return "update";
    }
    await this._create(obj);
    return "create";
  }

  async get(obj_id) {
    return this._store[obj_id];
  }

  async getAll() {
    return _.values(this._store);
  }

  async delete(obj_id) {
    const ret = this._store[obj_id] ? 1 : 0;
    delete this._store[obj_id];
    return ret;
  }

  async deleteAll() {
    const ret = _.keys(this._store).length;
    this._store = {};
    return ret;
  }

  async _create(obj) {
    this._store[obj.id] = _.cloneDeep(obj);
  }

  async _update(obj_id, obj) {
    assert(obj_id in this._store);
    this._store[obj_id] = _.cloneDeep(obj);
  }
}

class WorkflowMemoryPersist extends MemoryPersist {
  get instance() {
    return this._instance;
  }

  set instance(instance) {
    this._instance = instance;
  }

  constructor() {
    super(Workflow);
    if (WorkflowMemoryPersist.instance) {
      return WorkflowMemoryPersist.instance;
    }
    WorkflowMemoryPersist.instance = this;
  }

  async getAll() {
    const workflows_by_name = _.groupBy(Object.values(this._store), "name");
    return Object.values(workflows_by_name).map(
      (workflows) => _.maxBy(workflows, (workflow) => workflow["version"])
    );
  }

  async save(workflow) {
    const version = Object.values(this._store).reduce((current_version, item) => {
      if (workflow.name === item.name && item.version > current_version) {
        current_version = item.version;
      }
      return current_version;
    }, 0)
    const saved_workflow = _.cloneDeep(workflow);
    saved_workflow.version = version + 1;
    this._store[workflow.id] = saved_workflow;
    return "create";
  }

  async getByName(obj_name) {
    return Object.values(this._store).find( (workflow) => {
      return workflow.name === obj_name
    })
  }
}

class PackagesMemoryPersist extends MemoryPersist {
  constructor() {
    super(Packages);
  }

  async getByName(obj_name) {
    return Object.entries(this._store).filter( (custom_package) => {
            return custom_package[1].name === obj_name
          })[0][1];
  }
}

class ProcessMemoryPersist extends MemoryPersist {
  get instance() {
    return this._instance;
  }

  set instance(instance) {
    this._instance = instance;
  }

  constructor() {
    super(Process);
    this._state_class = ProcessState;
    this._state_store = {};
    if (ProcessMemoryPersist.instance) {
      return ProcessMemoryPersist.instance;
    }
    ProcessMemoryPersist.instance = this;
  }

  async get(process_id) {
    const process = this._store[process_id];
    if (process) {
      process.state = await this.getLastStateByProcess(process_id);
    }
    return process;
  }

  async getAll(filters) {
   let processes = _.values(this._store);
   if (filters) {
     if (filters.workflow_id) {
       processes = _.filter(processes, { workflow_id: filters.workflow_id});
     }
   }
   for (const process of processes) {
     process.state = await this.getLastStateByProcess(process.id);
   }
   return processes;
  }

  async delete(process_id) {
    const process_states = _.filter(this._state_store, {process_id: process_id});
    const process_state_ids = _.map(process_states, state => state.id);
    for (process_state_id of process_state_ids) {
      delete this._state_store[process_state_id];
    }
    return await super.delete(process_id);
  }

  async deleteAll() {
    this._state_store = {};
    return await super.deleteAll();
  }

  async getStateHistoryByProcess(process_id) {
    const states = _.filter(this._state_store, {process_id: process_id});
    return _.orderBy(states, "step_number", "desc");
  }

  async getLastStateByProcess(process_id) {
    return (await this.getStateHistoryByProcess(process_id))[0];
  }

  async getLastStepNumber(process_id) {
    const states = _.filter(this._state_store, {process_id: process_id});
    const last_state = _.maxBy(states, (state) => state.step_number);
    const last_step = last_state ? last_state.step_number : 0;
    return last_step;
  }

  async getTasks(filters) {
    let states = _.values(this._state_store);
    const workflow_persist = new PersistorSingleton()
          .getPersistInstance("Workflow");
    states = _.map(states, state => {
      return {...state,
              process: this._store[state.process_id]};
    });
    states = _.map(states, state => {
      return {...state,
              workflow: workflow_persist._store[state.process.workflow_id]};
    });
    if (filters) {
      if (filters.workflow_id) {
        states = _.filter(states, {workflow: {id: filters.workflow_id}});
      }
    }
    return _.map(states, state => {
      const w = state.workflow;
      const p = state.process;
      const ps = state;
      return {
        workflow_name: w.name,
        blueprint_spec: w.blueprint_spec,
        process_id: p.id,
        process_status: ps.status,
        process_last_update: ps.created_at,
        process_step_number: ps.step_number,
        current_node_id: ps.node_id,
        bag: ps.bag
      };
    });
  }

  async getWorkflowWithProcesses(filters) {
    const processes = Object.entries(this._store).map(entry => entry[1]);
    const list_workflow_data = [];
    for (const process of processes) {
      let skipProcess = false;

      if (filters) {
        if (filters.workflow_id && process.workflow_id !== filters.workflow_id) {
          skipProcess = true;
        }

        if (filters.start_date) {
          let filter_date = filters.start_date;
          if (!(filter_date instanceof Date)) {
            filter_date = new Date(filter_date);
          }
          if (process.created_at.getTime() < filter_date.getTime()) {
            skipProcess = true;
          }
        }

        if (filters.end_date) {
          let filter_date = filters.end_date;
          if (!(filter_date instanceof Date)) {
            filter_date = new Date(filter_date);
          }
          if (process.created_at.getTime() > filter_date.getTime()) {
            skipProcess = true;
          }
        }
      }

      if (!skipProcess) {
        const workflow = await new WorkflowMemoryPersist().get(process.workflow_id);
        const workflow_data = {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
        }
        workflow_data.state = await this.getLastStateByProcess(process.id);
        list_workflow_data.push(workflow_data);
      }
    }
    return list_workflow_data;
  }

  async _create(process) {
    const state = process.state;
    delete process["state"];
    super._create(process);
    if (state) {
      this._state_store[state.id] = _.cloneDeep(state);
    }
  }

  async _update(process_id, process) {
    const state = process.state;
    this._state_store[state.id] = _.cloneDeep(state);
  }
}

class ActivityManagerMemoryPersist extends MemoryPersist {
  constructor() {
    super(ActivityManager);
    this._process_class = new ProcessMemoryPersist();
    this._workflow_class = new WorkflowMemoryPersist();
    this._activity_class = new ActivityMemoryPersist();
  }

  async getActiveActivityManagers() {
    const store_array = _.values(this._store);
    return _.filter(store_array, (activity_manager) => {
      return activity_manager.status==="started";
    });
  }

  async getCompletedActivityManagers() {
    const store_array = _.values(this._store);
    return _.filter(store_array, (activity_manager) => {
      return activity_manager.status==="completed";
    });
  }

  async getActivityDataFromStatus(status, filters) {
    const store_array = _.values(this._store);
    const activity_managers = _.filter(store_array, (activity_manager) => {
      return activity_manager.status===status;
    });
    const response_array = [];
    _.map(activity_managers, (activity_manager) => {
      const state_store = this._process_class._state_store;
      const state_array = _.values(state_store);
      const process_states = _.filter(state_array, (state) => {
        return state.id===activity_manager.process_state_id;
      });
      _.map(process_states, (state) => {
        const process_store = this._process_class._store;
        const process_array = _.values(process_store);
        const processes = _.filter(process_array, (process) => {
          return process.id===state.process_id;
        });
        _.map(processes, (process) => {
          const workflow_store = this._workflow_class._store;
          const workflow_array = _.values(workflow_store);
          const workflow = _.filter(workflow_array, (workflow) => {
            const result_filters = [
              workflow.id===process.workflow_id
            ];
            if (filters) {
              if (filters.workflow_id) {
                result_filters.push(workflow.id === filters.workflow_id);
              }
              if (filters.process_id) {
                result_filters.push(process.id === filters.process_id);
              }
              if (filters.status) {
                result_filters.push(activity_manager.status === filters.status);
              }
              if (filters.type) {
                result_filters.push(activity_manager.type === filters.type);
              }
              if (filters.current_status) {
                result_filters.push(process.current_status === filters.current_status);
              }
            }
            return result_filters.reduce((result, current) => result && current, true)
          })[0];
          if(workflow) {
            const response = this._format_activity_response(activity_manager,
                                                            state,
                                                            process,
                                                            workflow);
            response_array.push(response);
          }
        });
      });
    });
    return response_array;
  }

  async getActivityDataFromId(obj_id) {
    const store_array = _.values(this._store);
    const activity_manager = _.filter(store_array, (ac_manager) => {
      return ac_manager.id===obj_id;
    })[0];

    const state_store = this._process_class._state_store;
    const state_array = _.values(state_store);
    const state = _.filter(state_array, (state) => {
      return state.id===activity_manager.process_state_id;
    })[0];

    const process_store = this._process_class._store;
    const process_array = _.values(process_store);
    const process = _.filter(process_array, (process) => {
      return process.id===state.process_id;
    })[0];

    const workflow_store = this._workflow_class._store;
    const workflow_array = _.values(workflow_store);
    const workflow = _.filter(workflow_array, (workflow) => {
      return workflow.id===process.workflow_id;
    })[0];

    let response;
    if (activity_manager) {
      response = this._format_activity_response(activity_manager,
        state,
        process,
        workflow);
    }
    return response;
  }

  async getProcessId(process_state_id) {
    const state_store = this._process_class._state_store;
    const state_array = _.values(state_store);
    const process_state = _.filter(state_array, (state) => {
      return state.id===process_state_id;
    });
    return process_state[0];
  }

  async getActivities(activity_manager_id) {
    const activity_store = this._activity_class._store;
    const activity_array = _.values(activity_store);
    return _.filter(activity_array, (activity) => {
      return activity.activity_manager_id===activity_manager_id;
    });
  }

  _format_activity_response(activity_manager, state, process, workflow) {
    return {
      id: activity_manager.id,
      created_at: activity_manager.created_at,
      type: activity_manager.type,
      process_state_id: activity_manager.process_state_id,
      props: activity_manager.props,
      parameters: activity_manager.parameters,
      activity_status: activity_manager.status,
      process_id: state.process_id,
      step_number: state.step_number,
      node_id: state.node_id,
      next_node_id: state.next_node_id,
      bag: state.bag,
      external_input: state.external_input,
      error: state.error,
      process_status: state.status,
      workflow_id: process.workflow_id,
      blueprint_spec: process.blueprint_spec,
      workflow_name: workflow.name,
      workflow_description: workflow.description
    };
  }
}

class ActivityMemoryPersist extends MemoryPersist {
  get instance() {
    return this._instance;
  }

  set instance(instance) {
    this._instance = instance;
  }

  constructor() {
    super(Activity);
    if (ActivityMemoryPersist.instance) {
      return ActivityMemoryPersist.instance;
    }
    ActivityMemoryPersist.instance = this;
  }
}

module.exports = {
  MemoryPersist: MemoryPersist,
  WorkflowMemoryPersist: WorkflowMemoryPersist,
  PackagesMemoryPersist: PackagesMemoryPersist,
  ProcessMemoryPersist: ProcessMemoryPersist,
  ActivityManagerMemoryPersist: ActivityManagerMemoryPersist,
  ActivityMemoryPersist: ActivityMemoryPersist
};
