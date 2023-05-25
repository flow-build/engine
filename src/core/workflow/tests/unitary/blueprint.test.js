const _ = require("lodash");
const { Blueprint } = require("../../../workflow/blueprint");
const { blueprints_ } = require("./blueprint_samples");
const allNodeTypes = require("../examples/allNodeTypes");
const { PersistorProvider } = require("../../../persist/provider");
const { EnvironmentVariable } = require("../../../workflow/environment_variable");
const settings = require("../../../../../settings/tests/settings");

beforeAll(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = EnvironmentVariable.getPersist();
    await persist._db.destroy();
  }
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const environment_variable_persist = persistor.getPersistInstance("EnvironmentVariable");
  await environment_variable_persist.deleteAll();
};

test("constructor works for valid spec", () => {
  expect(() => {
    new Blueprint(blueprints_.minimal).toBeInstanceOf(Blueprint);
  });
});

test("has_spec constraint works", async () => {
  const [is_valid, error] = await Blueprint.validate(null);
  expect(is_valid).toBe(false);
  expect(error).toBe("has_spec");
});

test("has_nodes constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["nodes"];
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("has_nodes");
});

test("has_lanes constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["lanes"];
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("has_lanes");
});

test("has_requirements constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["requirements"];
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("has_requirements");
});

test("has_prepare constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec["prepare"];
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("has_prepare");
});

test("has_environment constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  delete spec.environment;
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toEqual(false);
  expect(error).toEqual("has_environment");
});

test("environment_has_valid_type constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.environment = "";
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toEqual(false);
  expect(error).toEqual("environment_has_valid_type");
});

test("nodes_has_valid_type constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes = "any";
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("nodes_has_valid_type");
});

test("lanes_has_valid_type constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.lanes = "any";
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("lanes_has_valid_type");
});

test("requirements_has_valid_type constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.requirements = "any_invalid";
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("requirements_has_valid_type");
});

test("prepare_has_valid_type constraint works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.prepare = "any_invalid";
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("prepare_has_valid_type");
});

describe("test validate_environment_variable", async () => {
  test("pass with no environment variable", async () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    const error = await Blueprint.validate(spec);
    expect(error[0]).toBeTruthy();
    expect(error[1]).toBeNull();
  });

  test("pass when using an existing environment variable", async () => {
    const spec = _.cloneDeep(blueprints_.existent_environment_variable);
    const error = await Blueprint.validate(spec);
    expect(error[0]).toBeTruthy();
    expect(error[1]).toBeNull();
  });

  test("throw warning when not using an existing environment variable", async () => {
    process.env.API_HOST = "www.random_string.com";
    process.env.TOKEN = "random_string";

    const spec = _.cloneDeep(blueprints_.minimal);
    spec.environment = { path: "PATH" };
    const error = await Blueprint.validate(spec);
    expect(error[0]).toBeTruthy();
    expect(error[1][0]).toBe("Environment variable path not found in nodes");
  });

  test("throw warning when not using an inexistent environment variable", async () => {
    const spec = _.cloneDeep(blueprints_.existent_environment_variable);
    spec.environment = { inexistent: "INEXISTENT" };
    const error = await Blueprint.validate(spec);
    expect(error[0]).toBeTruthy();
    expect(error[1][0]).toBe("Variable inexistent not found in environment");
    expect(error[2][0]).toBe("Environment variable inexistent not found in nodes");
  });

  test("throw error when using an inexistent environment variable", async () => {
    const spec = _.cloneDeep(blueprints_.inexistent_environment_variable);
    const error = await Blueprint.validate(spec);
    expect(error[0]).toBeFalsy();
    expect(error[1][0]).toBe("Variable inexistent not found in environment");
  });
});

describe("has_valid_start_nodes", async () => {
  test("valid minimal blueprint", async () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });

  test("valid multiple start blueprint", async () => {
    const spec = _.cloneDeep(blueprints_.multiple_starts);
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });

  test("invalid no start node", async () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    spec.nodes.splice(0, 1);
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toEqual("has_valid_start_nodes");
  });

  test("invalid multiple start nodes on same lane", async () => {
    const spec = _.cloneDeep(blueprints_.multiple_starts);
    for (const node of spec.nodes) {
      if (node.type === "Start") {
        node.lane_id = "1";
      }
    }
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toEqual("has_valid_start_nodes");
  });
});

describe("has_at_least_one_finish_node", async () => {
  test("blueprint with more than one finish node", async () => {
    const spec = _.cloneDeep(blueprints_.multiple_finish);
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(true);
    expect(error).toBeNull();
  });

  test("has_at_least_one_finish_node constraint works", async () => {
    const spec = _.cloneDeep(blueprints_.minimal);
    delete spec.nodes[spec.nodes.length - 1];
    const [is_valid, error] = await Blueprint.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toBe("has_at_least_one_finish_node");
  });
});

test("are_all_nodes_present constraint works", async () => {
  let spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes[0].next = 99;
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("are_all_nodes_present");
});

test("are_all_lanes_present constraint works", async () => {
  let spec = _.cloneDeep(blueprints_.minimal);
  spec.nodes[0].lane_id = 99;
  let [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("are_all_lanes_present");
});

test("validation of spec with _extract in parameters works", async () => {
  const spec = _.cloneDeep(blueprints_.minimal);
  spec.parameters = {
    _extract: "invalid",
  };
  const [is_valid, error] = await Blueprint.validate(spec);
  expect(is_valid).toBe(false);
  expect(error).toBe("data/_extract must be boolean");
});

test("throw warning when using upper case in node extract", async () => {
  const spec = _.cloneDeep(blueprints_.extract_node_blueprint);

  const [is_valid, error, warnings] = await Blueprint.validate(spec);
  expect(is_valid).toBeTruthy();
  expect(error).toBeNull();
  expect(warnings.nodes).toHaveLength(1);
  expect(warnings.nodes[0]).toEqual("node NODE-TO-START-PROCESS: extract will be saved in lower case - startprocessdata");
});

describe("Blueprint.validate", () => {
  test("fails if node_id repeats", async () => {
    const blueprint_spec = _.cloneDeep(blueprints_.minimal);
    blueprint_spec.nodes.push({
      id: blueprint_spec.nodes[0].id,
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "2",
      lane_id: "1",
      parameters: {
        input: {},
      },
    });

    const response = await Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(false);
    expect(response[1]).toMatch("are_all_nodes_present");
  });

  test("fails if lane_id repeats", async () => {
    const blueprint_spec = _.cloneDeep(blueprints_.minimal);
    blueprint_spec.lanes.push({
      id: blueprint_spec.lanes[0].id,
      name: "the_only_lane",
      rule: ["fn", ["&", "args"], true],
    });

    const response = await Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(false);
    expect(response[1]).toMatch("found existing lane_id");
  });

  test("works for all default node types & categories", async () => {
    const blueprint_spec = allNodeTypes.blueprint_spec;
    const response = await Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(true);
  });
});

describe("Blueprint lane rule validate", async () => {
  test("pass with lisp rule in lane", async () => {
    const blueprint_spec = _.cloneDeep(blueprints_.minimal);
    const response = await Blueprint.validate(blueprint_spec);
    expect(response[0]).toEqual(true);
    expect(response[1]).toBeNull();
  });

  test("pass with JS rule in lane", async () => {
    let minimalBlueprint = _.cloneDeep(blueprints_.minimal);
    minimalBlueprint.lanes[0].rule = { $js: "async () => true" };

    const response = await Blueprint.validate(minimalBlueprint);
    expect(response[0]).toEqual(true);
    expect(response[1]).toBeNull();
  });
});

test("fetchNode works for existing nodes", async () => {
  const nodeId = "minimal_2";
  const spec = blueprints_.minimal;
  const idSecondNode = spec.nodes[1];
  const blueprint = new Blueprint(spec);
  expect(blueprint.fetchNode(nodeId)._spec).toMatchObject(idSecondNode);
});

test("fetchNode works for non existing nodes", async () => {
  const node_id = 99;
  const blueprint = new Blueprint(blueprints_.minimal);
  expect(blueprint.fetchNode(node_id)).toBeFalsy();
});

describe("prepareSpec", () => {
  test("Change environment values to values on 'process.ENV'", async () => {
    const original_node_env = process.env.NODE_ENV;
    const original_api_host = process.env.API_HOST;
    try {
      process.env.NODE_ENV = "test";
      process.env.API_HOST = "localhost";

      const result_spec = await Blueprint.parseSpec(blueprints_.environment);
      expect(result_spec.environment.node_env).toEqual("test");
      expect(result_spec.environment.host).toEqual("localhost");
    } finally {
      process.env.NODE_ENV = original_node_env;
      process.env.API_HOST = original_api_host;
    }
  });

  test("Change environment values to values on environment_variable table", async () => {
    process.env.API_HOST = "localhost";
    process.env.MAX_LIMIT = 99;
  
    await new EnvironmentVariable("API_HOST", "0.0.0.0").save();
    await new EnvironmentVariable("MAX_LIMIT", 999).save();
    const environment_variables = await EnvironmentVariable.fetchAll();
  
    const result_spec = await Blueprint.parseSpec(blueprints_.environment, environment_variables);
    expect(result_spec.environment.host).toEqual("0.0.0.0");
    expect(result_spec.environment.limit).toEqual(999);
  });
});
