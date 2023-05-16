const lodash = require("lodash");
const assert = require("assert");
const bpu = require("../utils/blueprint");
const obju = require("../utils/object");
const { Lane } = require("./lanes");
const { Validator } = require("../validators");
const node_factory = require("../utils/node_factory");
const ajvValidator = require("../utils/ajvValidator");
const { EnvironmentVariable } = require("./environment_variable");

class Blueprint {
  static get rules() {
    return {
      has_spec: [obju.isNotNull],
      has_nodes: [obju.hasField, "nodes"],
      has_lanes: [obju.hasField, "lanes"],
      has_requirements: [obju.hasField, "requirements"],
      has_prepare: [obju.hasField, "prepare"],
      has_environment: [obju.hasField, "environment"],
      environment_has_valid_type: [obju.isFieldOfType, "environment", "object"],
      nodes_has_valid_type: [obju.isFieldOfType, "nodes", "object"],
      lanes_has_valid_type: [obju.isFieldOfType, "lanes", "object"],
      requirements_has_valid_type: [obju.isFieldOfType, "requirements", "object"],
      prepare_has_valid_type: [obju.isFieldOfType, "prepare", "object"],
      has_valid_start_nodes: [bpu.hasValidStartNodes],
      has_at_least_one_finish_node: [bpu.hasAtLeastOneFinishNode],
      are_all_nodes_present: [bpu.areAllNodesPresent],
      are_all_lanes_present: [bpu.areAllLanesPresent],
    };
  }

  static validate_nodes(spec) {
    const nodeSet = new Set();
    for (const node_spec of spec.nodes) {
      if (nodeSet.has(node_spec.id)) {
        return [false, `found existing node_id ${node_spec.id}`];
      }
      nodeSet.add(node_spec.id);
      const [is_valid, error] = Blueprint._parseNode(node_spec).validate();
      if (!is_valid) {
        const node_id = node_spec.id;
        const error_message = `node ${node_id}: ${error}`;
        return [false, error_message];
      }
    }
    return [true, null];
  }

  static validate_lanes(spec) {
    const laneSet = new Set();
    for (const lane_spec of spec.lanes) {
      if (laneSet.has(lane_spec.id)) {
        return [false, `found existing lane_id ${lane_spec.id}`];
      }
      laneSet.add(lane_spec.id);
      const [is_valid, error] = Blueprint._parseLane(lane_spec).validate();
      if (!is_valid) {
        const lane_id = lane_spec.id;
        const error_message = `lane ${lane_id}: ${error}`;
        return [false, error_message];
      }
    }
    return [true, null];
  }

  static validate_environment_variable(spec, env_variables) {
    let validate_info = {
      nodes: [],
      ambient: [],
    };
    const nodesString = JSON.stringify(spec.nodes);
    for (const variable in spec.environment) {
      const spec_var = spec?.environment[variable];
      const env_var = env_variables?.find((env_var) => env_var?.key === spec_var);
      if ((!process.env[spec_var] && spec_var?.toLowerCase() === variable) && !env_var) {
        if (!process.env[variable.toUpperCase()] || !env_var) {
          const error_message = `Environment variable ${variable} not found in ambient`;
          validate_info.ambient.push(error_message);
        }
      }
      if (!nodesString.includes(`environment.${variable}`)) {
        const error_message = `Environment variable ${variable} not found in nodes`;
        validate_info.nodes.push(error_message);
      }
    }
    if (lodash.isEmpty(validate_info.nodes) && lodash.isEmpty(validate_info.ambient)) {
      return [true, null];
    } else {
      return validate_info;
    }
  }

  static validate(spec, environment_variables) {
    const [is_valid, error] = new Validator(this.rules).validate(spec);
    if (!is_valid) {
      return [false, error];
    }
    const [is_nodes_valid, nodes_error] = Blueprint.validate_nodes(spec);
    if (!is_nodes_valid) {
      return [false, nodes_error];
    }
    const blueprint_env_status = Blueprint.validate_environment_variable(spec, environment_variables);
    if (!lodash.isEmpty(blueprint_env_status.nodes) && !lodash.isEmpty(blueprint_env_status.ambient)) {
      emitter.emit("BLUEPRINT.UNUSED_VARIABLES", "UNUSED ENVIRONMENT VARIABLES", {
        nodes: blueprint_env_status.nodes,
        ambient: blueprint_env_status.ambient,
      });
      return [true, blueprint_env_status.ambient, blueprint_env_status.nodes];
    } else if (!lodash.isEmpty(blueprint_env_status.nodes)) {
      emitter.emit("BLUEPRINT.UNUSED_VARIABLES", "UNUSED ENVIRONMENT VARIABLES", { nodes: blueprint_env_status.nodes });
      return [true, blueprint_env_status.nodes];
    } else if (!lodash.isEmpty(blueprint_env_status.ambient)) {
      emitter.emit("BLUEPRINT.NON_EXISTENT_VARIABLES", "NON EXISTENT ENVIRONMENT VARIABLES", {
        ambient: blueprint_env_status.ambient,
      });
      return [false, blueprint_env_status.ambient];
    }

    if (spec.parameters) {
      ajvValidator.validateBlueprintParameters(spec.parameters);
    }

    return Blueprint.validate_lanes(spec);
  }

  static async assert_is_valid(spec) {
    const environment_variables = await EnvironmentVariable.fetchAll();
    const [is_valid, error] = Blueprint.validate(spec, environment_variables);
    assert(is_valid, error);
  }

  static parseSpec(blueprint_spec, env_variables) {
    const result_spec = lodash.cloneDeep(blueprint_spec);
    for (const [key, value] of Object.entries(result_spec.environment)) {
      const env_var = env_variables?.find((variable) => variable?.key === value);
      if (env_var) {
        result_spec.environment[key] = env_var.value;
      } else {
        result_spec.environment[key] = process.env[value];
      }
    }
    return result_spec;
  }

  static _parseNode(node_spec) {
    return node_factory.getNode(node_spec);
  }

  static _parseLane(lane_spec) {
    return new Lane(lane_spec);
  }

  constructor(spec) {
    this._spec = spec;
  }

  fetchNode(node_id) {
    const node = this._spec.nodes.filter((node_spec) => node_spec["id"] == node_id)[0];
    return node ? Blueprint._parseNode(node) : null;
  }

  fetchNodeLane(node_id) {
    const node = this._spec.nodes.filter((node_spec) => node_spec.id == node_id)[0];
    if (node) {
      const lane_id = node.lane_id;
      const lane = this._spec.lanes.filter((lane_spec) => lane_spec.id == lane_id)[0];
      return lane ? Blueprint._parseLane(lane) : null;
    }
    return null;
  }
}

module.exports = {
  Blueprint: Blueprint,
};
