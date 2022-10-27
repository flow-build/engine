const { PersistedEntity } = require("./base");
const { Process } = require("./process");
const { Blueprint } = require("./blueprint");
const JSum = require("jsum");
const { v1: uuid } = require("uuid");
class Workflow extends PersistedEntity {
  static getEntityClass() {
    return Workflow;
  }

  static serialize(workflow) {
    return {
      id: workflow._id,
      created_at: workflow._created_at,
      name: workflow._name,
      description: workflow._description,
      blueprint_spec: workflow._blueprint_spec,
      version: workflow._version,
      blueprint_hash: workflow._blueprint_hash,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const workflow = new Workflow(serialized.name, serialized.description, serialized.blueprint_spec);
      workflow._id = serialized.id;
      workflow._created_at = serialized.created_at;
      workflow._version = serialized.version;
      workflow._blueprint_hash = serialized.blueprint_hash;
      workflow._latest = serialized?.latest;

      return workflow;
    }
    return undefined;
  }

  static async fetchWorkflowByName(workflow_name, version) {
    let workflow;
    if (!version || version === "latest") {
      workflow = await this.getPersist().getByName(workflow_name);
    } else {
      workflow = await this.getPersist().getByNameAndVersion(workflow_name, version);
    }

    return Workflow.deserialize(workflow);
  }

  static async fetchLatestWorkflowVersionById(workflow_id) {
    const workflow = await this.getPersist().getLatestVersionById(workflow_id);
    return Workflow.deserialize(workflow);
  }

  static async findWorkflowByBlueprintHash(blueprint_hash) {
    const workflow = await this.getPersist().getByHash(blueprint_hash);
    return workflow;
  }

  constructor(name, description, blueprint_spec, id = null) {
    super();

    if (blueprint_spec) {
      //Blueprint.assert_is_valid(blueprint_spec);
      this._blueprint_hash = JSum.digest(blueprint_spec, "SHA256", "hex");
    }

    this._id = id || uuid();
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
    return await new Process({ id: this._id, name: this._name }, Blueprint.parseSpec(this._blueprint_spec)).create(
      actor_data,
      initial_bag
    );
  }
}

module.exports.Workflow = Workflow;
