const _ = require("lodash");
const settings = require("../../../../../settings/tests/settings");
const { AssertionError } = require("assert");
const { Blueprint } = require("../../../workflow/blueprint");
const { PersistorSingleton } = require("../../../persist/persist");
const { blueprints_ } = require("./blueprint_samples");
const { nodes_ } = require("./node_samples");

test("constructor works for valid spec", () => {
  expect(() => {
    new Blueprint(blueprints_.minimal).toBeInstanceOf(Blueprint);
  });
});

test("has_spec constraint works", () => {
  const error = Blueprint.validate(null)[1];
  expect(error).toBe("has_spec");
});

test("has_nodes constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["nodes"];
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("has_nodes");
});

test("has_lanes constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["lanes"];
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("has_lanes");
});

test("has_requirements constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["requirements"];
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("has_requirements");
});

test("has_prepare constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["prepare"];
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("has_prepare");
});

test("has_environment constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec.environment;
  const [is_valid, error] = Blueprint.validate(spec);
  expect(is_valid).toEqual(false);
  expect(error).toEqual("has_environment")
});

test("environment_has_valid_type constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.environment = "";
  const [is_valid, error] = Blueprint.validate(spec);
  expect(is_valid).toEqual(false);
  expect(error).toEqual("environment_has_valid_type");
})

test("nodes_has_valid_type constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes = "any";
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("nodes_has_valid_type");
});

test("lanes_has_valid_type constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.lanes = "any";
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("lanes_has_valid_type");
});

test("requirements_has_valid_type constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.requirements = "any_invalid";
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("requirements_has_valid_type");
});

test("prepare_has_valid_type constraint works", () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.prepare = "any_invalid";
  const error = Blueprint.validate(spec)[1];
  expect(error).toBe("prepare_has_valid_type");
});

describe("has_valid_start_nodes", () => {
  test("valid minimal blueprint", () => {
    const spec = _.cloneDeep(blueprints_.minimal)
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });

  test("valid multiple start blueprint", () => {
    const spec = _.cloneDeep(blueprints_.multiple_starts)
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });

  test("invalid no start node", () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    spec.nodes.splice(0, 1);
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toEqual("has_valid_start_nodes");
  });

  test("invalid multiple start nodes on same lane", () => {
    const spec = _.cloneDeep(blueprints_.multiple_starts);
    for (const node of spec.nodes) {
      if (node.type === "Start") {
        node.lane_id = "1";
      }
    }
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toEqual("has_valid_start_nodes");
  });
});

describe("has_at_least_one_finish_node", () => {
  test("blueprint with more than one finish node", () => {
    const spec = _.cloneDeep(blueprints_.multiple_finish);
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });
  
  test("has_at_least_one_finish_node constraint works", () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    delete spec.nodes[spec.nodes.length - 1];
    const [is_valid, error] = Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toBe("has_at_least_one_finish_node");
  });
});

test("are_all_nodes_present constraint works", () => {
  let spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes[0].next = 99;
  let error = Blueprint.validate(spec)[1];
  expect(error).toBe("are_all_nodes_present");
});

test("are_all_lanes_present constraint works", () => {
  let spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes[0].lane_id = 99;
  let error = Blueprint.validate(spec)[1];
  expect(error).toBe("are_all_lanes_present");
});

describe("Blueprint.validate", () => {
  test("fails if node_id repeats", () => {
    const blueprint_spec = _.cloneDeep(blueprints_.minimal);
    blueprint_spec.nodes.push({
      id: blueprint_spec.nodes[0].id,
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "2",
      lane_id: "1",
      parameters: {
        input: {}
      }
    });

    const response = Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(false);
    expect(response[1]).toMatch("found existing node_id");
  });

  test("fails if lane_id repeats", () => {
    const blueprint_spec = _.cloneDeep(blueprints_.minimal);
    blueprint_spec.lanes.push({
      id: blueprint_spec.lanes[0].id,
      name: "the_only_lane",
      rule: ["fn", ["&", "args"], true]
    });

    const response = Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(false);
    expect(response[1]).toMatch("found existing lane_id");
  });
});

test("fetchNode works for existing nodes", () => {
  const node_id = 2;
  const spec = blueprints_.minimal;
  const id_two_node = spec.nodes[1];
  const blueprint = new Blueprint(spec);
  expect(blueprint.fetchNode(node_id)._spec).toMatchObject(id_two_node);
});

test("fetchNode works for non existing nodes", () => {
  const node_id = 99;
  const blueprint = new Blueprint(blueprints_.minimal);
  expect(blueprint.fetchNode(node_id)).toBeFalsy();
});

describe("prepareSpec", () => {
  test("Change environment values to values on 'process.ENV'", () => {
    const original_node_env = process.env.NODE_ENV;
    const original_api_host = process.env.API_HOST;
    try {
      process.env.NODE_ENV = "test";
      process.env.API_HOST = "localhost";

      const result_spec = Blueprint.parseSpec(blueprints_.environment);
      expect(result_spec.environment.node_env).toEqual("test");
      expect(result_spec.environment.host).toEqual("localhost");
    } finally {
      process.env.NODE_ENV = original_node_env;
      process.env.API_HOST = original_api_host;
    }
  });
});
