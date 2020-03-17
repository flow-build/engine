const _ = require("lodash");
const delegate = require("delegates");
const bpu = require("../core/utils/blueprint");
const { Workflow } = require("../core/workflow/workflow");
const { Process } = require("../core/workflow/process");
const { Lane } = require("../core/workflow/lanes");
const { Packages } = require("../core/workflow/packages");
const { Engine } = require("../engine/engine");

class Cockpit {
  static get instance() {
    return Cockpit._instance;
  }

  static set instance(instance) {
    Cockpit._instance = instance;
  }

  constructor(persist_mode, persist_args) {
    if (Cockpit.instance) {
      return Cockpit.instance;
    }

    this._engine = new Engine(persist_mode, persist_args);
    delegate(this, "_engine")
      .method("fetchAvailableActivitiesForActor")
      .method("fetchDoneActivitiesForActor")
      .method("fetchAvailableActivityForProcess")
      .method("beginActivity")
      .method("commitActivity")
      .method("pushActivity")
      .method("createProcess")
      .method("createProcessByWorkflowName")
      .method("runProcess")
      .method("fetchProcess")
      .method('fetchProcessList')
      .method("fetchProcessStateHistory")
      .method("abortProcess")
      .method('setProcessState')
      .method("saveWorkflow")
      .method("fetchWorkflow")
      .method("deleteWorkflow")
      .method("savePackage")
      .method("fetchPackage")
      .method("deletePackage")
      .method("addCustomSystemCategory");

    Cockpit.instance = this;
  }

  async fetchWorkflowsWithProcessStatusCount(actor_data) {
    const workflows_data = await Process.getPersist().getWorkflowWithProcesses();
    const allowed_workflows = await this._filterForAllowedWorkflows(workflows_data, actor_data);
    return allowed_workflows.reduce((accum, workflow) => {
      const process_status = workflow.state.status;
      const workflow_name = workflow.name;
      if (accum[workflow_name]) {
        if (accum[workflow_name][process_status]) {
          accum[workflow_name][process_status] += 1;
        } else {
          accum[workflow_name][process_status] = 1;
        }
      } else {
        accum[workflow_name] = {
          description: workflow.description,
          blueprint_spec: workflow.blueprint_spec
        }
        accum[workflow_name][process_status] = 1;
      }
      return accum;
    }, {});
  }

  async getProcessStateHistory(process_id) {
    return await Process.getPersist().getStateHistoryByProcess(process_id);
  }

  async getWorkflowsForActor(actor_data) {
    const workflows_data = await Workflow.getPersist().getAll();
    return await this._filterForAllowedWorkflows(workflows_data, actor_data);
  }

  async _filterForAllowedWorkflows(workflows_data, actor_data) {
    const allowed_workflows = [];
    for (let workflow_data of workflows_data) {
      const blueprint_spec = workflow_data.blueprint_spec;
      const custom_lisp = await Packages._fetchPackages(
        blueprint_spec.requirements,
        blueprint_spec.prepare
      );
      const allowed_start_nodes = bpu.getAllowedStartNodes(blueprint_spec, actor_data, {}, custom_lisp);
      if (allowed_start_nodes.length === 1) {
        allowed_workflows.push(workflow_data);
      }
    }
    return allowed_workflows;
  }
}

module.exports = {
  Cockpit: Cockpit
};
