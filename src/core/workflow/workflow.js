const { PersistedEntity } = require("./base");
const { Process } = require("./process");
const { Blueprint } = require("./blueprint");

class Workflow extends PersistedEntity {

  static getEntityClass() {
    return Workflow;
  }

  static serialize(workflow) {
    const state = workflow.state;
    return {
      id: workflow._id,
      created_at: workflow._created_at,
      name: workflow._name,
      description: workflow._description,
      blueprint_spec: workflow._blueprint_spec,
      version: workflow._version
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const workflow = new Workflow(
        serialized.name,
        serialized.description,
        serialized.blueprint_spec);
      workflow._id = serialized.id;
      workflow._created_at = serialized.created_at;
      workflow._version = serialized.version;

      return workflow;
    }
    return undefined;
  }

  static async fetchWorkflowByName(workflow_name) {
    const workflow = await this.getPersist().getByName(workflow_name);
    return Workflow.deserialize(workflow);
  }

  constructor(name, description, blueprint_spec) {
    super();

    Blueprint.assert_is_valid(blueprint_spec);

    this._name = name;
    this._description = description;
    this._blueprint_spec = blueprint_spec;
  }

  get name() {
    return this._name;
  }

  get description() {
    return this._description;
  }

  get blueprint_spec() {
    return this._blueprint_spec;
  }

  async createProcess(actor_data, initial_bag = {}) {
    return await new Process({ id: this._id, name: this._name }, Blueprint.parseSpec(this._blueprint_spec)).create(actor_data, initial_bag);
  }
}

module.exports.Workflow = Workflow;
