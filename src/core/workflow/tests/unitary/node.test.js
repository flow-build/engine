const _ = require("lodash");
const { v1: uuid } = require("uuid");
const lisp = require("../../../lisp");
const nodes = require("../../../workflow/nodes");
const settings = require("../../../../../settings/tests/settings");
const { Packages } = require("../../../workflow/packages");
const { PersistorProvider } = require("../../../persist/provider");
const { ProcessStatus } = require("../../../workflow/process_state");
const process_manager = require("../../process_manager");
const { nodes_, results_ } = require("./node_samples");
const axios = require("axios");
const crypto_manager = require("../../../crypto_manager");

let package_persistor;
let core_package;
beforeAll(async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  package_persistor = persistor.getPersistInstance("Packages");
});

afterAll(async () => {
  if (settings.persist_options[0] === "knex") {
    await package_persistor._db.destroy();
  }
});

describe("Constraints test", () => {
  describe("Base node validators", () => {
    const spec_base_node_constraint = [
      { node_spec: nodes_.node, node: nodes.Node },
      { node_spec: nodes_.start, node: nodes.StartNode },
      { node_spec: nodes_.finish, node: nodes.FinishNode },
      { node_spec: nodes_.flow, node: nodes.FlowNode },
      { node_spec: nodes_.user_task, node: nodes.UserTaskNode },
      { node_spec: nodes_.script_task, node: nodes.ScriptTaskNode },
      { node_spec: nodes_.system_task, node: nodes.SystemTaskNode },
      { node_spec: nodes_.http_system_task, node: nodes.HttpSystemTaskNode },
      { node_spec: nodes_.set_to_bag_system_task, node: nodes.SetToBagSystemTaskNode },
      { node_spec: nodes_.timer_system_task, node: nodes.TimerSystemTaskNode },
      { node_spec: nodes_.start_process_system_task, node: nodes.StartProcessSystemTaskNode },
      { node_spec: nodes_.subprocess_task, node: nodes.SubProcessNode },
    ];

    for (const { node_spec, node } of spec_base_node_constraint) {
      test(`Node ${node.name} has_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["id"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_id");
      });

      test(`Node ${node.name} has_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["type"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_type");
      });

      test(`Node ${node.name} has_name constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["name"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_name");
      });

      test(`Node ${node.name} has_next constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["next"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_next");
      });

      test(`Node ${node.name} has_lane_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["lane_id"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_lane_id");
      });

      test(`Node ${node.name} id_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.id = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("id_has_valid_type");
      });

      test(`Node ${node.name} type_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.type = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("type_has_valid_type");
      });

      test(`Node ${node.name} next_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.next = undefined;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("next_has_valid_type");
      });

      test(`Node ${node.name} lane_id_has_valid_lane_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.lane_id = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("lane_id_has_valid_type");
      });
    }
  });

  describe("Parameter with input constraints", () => {
    const specs_with_parameter_input = [
      { node_spec: nodes_.flow, nodeClass: nodes.FlowNode },
      { node_spec: nodes_.user_task, nodeClass: nodes.UserTaskNode },
      { node_spec: nodes_.script_task, nodeClass: nodes.ScriptTaskNode },
      { node_spec: nodes_.system_task, nodeClass: nodes.SystemTaskNode },
      { node_spec: nodes_.http_system_task, nodeClass: nodes.HttpSystemTaskNode },
      { node_spec: nodes_.set_to_bag_system_task, nodeClass: nodes.SetToBagSystemTaskNode },
      { node_spec: nodes_.timer_system_task, nodeClass: nodes.TimerSystemTaskNode },
      { node_spec: nodes_.start_process_system_task, nodeClass: nodes.StartProcessSystemTaskNode },
      { node_spec: nodes_.subprocess_task, nodeClass: nodes.SubProcessNode },
    ];

    for (const { node_spec, nodeClass } of specs_with_parameter_input) {
      test(`Node ${nodeClass.name} has_parameters constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["parameters"];
        const [is_valid, error] = nodeClass.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("has_parameters");
      });

      test(`Node ${nodeClass.name} parameters_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.parameters = "parameters";
        const [is_valid, error] = nodeClass.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("parameters_has_valid_type");
      });

      test(`Node ${nodeClass.name} validate parameters_has_input`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec.parameters["input"];
        const [is_valid, error] = nodeClass.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("parameters_has_input");
      });

      test(`Node ${nodeClass.name} input_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.parameters.input = "input";
        const [is_valid, error] = nodeClass.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("input_has_valid_type");
      });
    }
  });

  describe("StartNode", () => {
    test("StartNode next_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.start);
      spec.next = {};
      const [is_valid, error] = nodes.StartNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("next_has_valid_type");
    });

    test("has_parameters constraint works", () => {
      const node_spec = _.cloneDeep(nodes_.start);
      delete node_spec.parameters;
      const [is_valid, error] = nodes.StartNode.validate(node_spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("has_parameters");
    });

    test("parameters_has_valid_type constraint works", () => {
      const node_spec = _.cloneDeep(nodes_.start);
      node_spec.parameters = 22;
      const [is_valid, error] = nodes.StartNode.validate(node_spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("parameters_has_valid_type");
    });

    test("parameters_has_input_schema constraint works", () => {
      const node_spec = _.cloneDeep(nodes_.start);
      delete node_spec.parameters.input_schema;
      const [is_valid, error] = nodes.StartNode.validate(node_spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("parameters_has_input_schema");
    });

    test("input_schema_has_valid_type constraint works", () => {
      const node_spec = _.cloneDeep(nodes_.start);
      node_spec.parameters.input_schema = "";
      const [is_valid, error] = nodes.StartNode.validate(node_spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("input_schema_has_valid_type");
    });
  });

  test("FinishNode next_is_null constraint works", () => {
    const spec = _.cloneDeep(nodes_.finish);
    spec.next = {};
    const [is_valid, error] = nodes.FinishNode.validate(spec);
    expect(is_valid).toEqual(false);
    expect(error).toBe("next_is_null");
  });

  describe("UserTaskNode", () => {
    test("UserTaskNode next_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.user_task);
      spec.next = {};
      const [is_valid, error] = nodes.UserTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("next_has_valid_type");
    });

    test("UserTaskNode parameters_has_action constraint works", () => {
      const spec = _.cloneDeep(nodes_.user_task);
      delete spec.parameters["action"];
      const [is_valid, error] = nodes.UserTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("parameters_has_action");
    });

    describe("timeout_has_valid_type constraint works", () => {
      test("fails with string", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.timeout = "22";
        const [is_valid, error] = nodes.UserTaskNode.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toEqual("timeout_has_valid_type");
      });

      test("valid with undefined", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.timeout = undefined;
        const [is_valid] = nodes.UserTaskNode.validate(spec);
        expect(is_valid).toEqual(true);
      });

      test("valid with number", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.timeout = 10;
        const [is_valid] = nodes.UserTaskNode.validate(spec);
        expect(is_valid).toEqual(true);
      });
    });

    describe("channels_has_valid_type constraint works", () => {
      test("fails with string", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.channels = "1";

        const [is_valid, error] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(false);
        expect(error).toEqual("channels_has_valid_type");
      });

      test("fails with null", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.channels = null;

        const [is_valid, error] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(false);
        expect(error).toEqual("channels_has_valid_type");
      });

      test("valid with undefined", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.channels = undefined;

        const [is_valid] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(true);
      });

      test("valid with array", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.channels = [];

        const [is_valid] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(true);
      });
    });

    describe("encrypted_data_has_valid_type constraint works", () => {
      test("fails with string", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.encrypted_data = "1";

        const [is_valid, error] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(false);
        expect(error).toEqual("encrypted_data_has_valid_type");
      });

      test("fails with null", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.encrypted_data = null;

        const [is_valid, error] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(false);
        expect(error).toEqual("encrypted_data_has_valid_type");
      });

      test("valid with undefined", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.encrypted_data = undefined;

        const [is_valid] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(true);
      });

      test("valid with array", () => {
        const spec = _.cloneDeep(nodes_.user_task);
        spec.parameters.encrypted_data = [];

        const [is_valid] = nodes.UserTaskNode.validate(spec);

        expect(is_valid).toEqual(true);
      });
    });
  });

  describe("ScriptTaskNode", () => {
    test("ScriptTaskNode parameters_has_script constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      delete spec.parameters["script"];
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("parameters_has_script");
    });

    test("ScriptTaskNode parameters_script_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      spec.parameters.script = undefined;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("parameters_script_has_valid_type");
    });

    test("ScriptTaskNode script_has_function constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      delete spec.parameters.script.function;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("script_has_function");
    });

    test("ScriptTaskNode script_args_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      spec.parameters.script.args = 1;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("script_args_has_valid_type");
    });
  });

  describe("SystemTaskNode", () => {
    const specs_system_tasks = [
      { node_spec: nodes_.system_task, node: nodes.SystemTaskNode },
      { node_spec: nodes_.http_system_task, node: nodes.HttpSystemTaskNode },
      { node_spec: nodes_.set_to_bag_system_task, node: nodes.SetToBagSystemTaskNode },
      { node_spec: nodes_.timer_system_task, node: nodes.TimerSystemTaskNode },
    ];

    for (const { node_spec, node } of specs_system_tasks) {
      test(`Node ${node.name} next_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.next = {};
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toBe("next_has_valid_type");
      });
    }
  });

  describe("HttpSystemTaskNode", () => {
    test("HttpSystemTaskNode parameters_has_request constraint works", () => {
      const spec = _.cloneDeep(nodes_.http_system_task);
      delete spec.parameters.request;
      const [is_valid, error] = nodes.HttpSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("parameters_has_request");
    });

    test("HttpSystemTaskNode parameters_request_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.http_system_task);
      spec.parameters.request = undefined;
      const [is_valid, error] = nodes.HttpSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("parameters_request_has_valid_type");
    });

    test("HttpSystemTaskNode request_has_url constraint works", () => {
      const spec = _.cloneDeep(nodes_.http_system_task);
      delete spec.parameters.request.url;
      const [is_valid, error] = nodes.HttpSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("request_has_url");
    });

    test("HttpSystemTaskNode request_has_verb constraint works", () => {
      const spec = _.cloneDeep(nodes_.http_system_task);
      delete spec.parameters.request.verb;
      const [is_valid, error] = nodes.HttpSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("request_has_verb");
    });

    test("HttpSystemTaskNode request_header_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.http_system_task);
      spec.parameters.request.header = "string";
      const [is_valid, error] = nodes.HttpSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toBe("request_header_has_valid_type");
    });

    describe("parameters_valid_response_codes_has_valid_type constraint works", () => {
      test("valid undefined value", () => {
        const node_spec = _.cloneDeep(nodes_.http_system_task);
        delete node_spec.parameters.valid_response_codes;

        const [is_valid, error] = nodes.HttpSystemTaskNode.validate(node_spec);

        expect(is_valid).toEqual(true);
        expect(error).toBeNull();
      });

      test("valid array value", () => {
        const node_spec = _.cloneDeep(nodes_.http_system_task);
        node_spec.parameters.valid_response_codes = [];

        const [is_valid, error] = nodes.HttpSystemTaskNode.validate(node_spec);

        expect(is_valid).toEqual(true);
        expect(error).toBeNull();
      });

      test("invalid object value", () => {
        const node_spec = _.cloneDeep(nodes_.http_system_task);
        node_spec.parameters.valid_response_codes = {};

        const [is_valid, error] = nodes.HttpSystemTaskNode.validate(node_spec);

        expect(is_valid).toEqual(false);
        expect(error).toEqual("parameters_valid_response_codes_has_valid_type");
      });
    });
  });

  describe("TimerSystemTaskNode", () => {
    test("Constraint parameters_has_timeout works", () => {
      const spec = _.cloneDeep(nodes_.timer_system_task);
      delete spec.parameters.timeout;
      const [is_valid, error] = nodes.TimerSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("parameters_has_timeout");
    });

    test("Constraint parameters_timeout_has_valid_type works", () => {
      const spec = _.cloneDeep(nodes_.timer_system_task);
      spec.parameters.timeout = "22";
      const [is_valid, error] = nodes.TimerSystemTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toEqual("parameters_timeout_has_valid_type");
    });
  });

  describe("Samples are valid", () => {
    const nodes_samples_spec_class = [
      { node_spec_name: "node", node_class: nodes.Node },
      { node_spec_name: "start", node_class: nodes.StartNode },
      { node_spec_name: "finish", node_class: nodes.FinishNode },
      { node_spec_name: "flow", node_class: nodes.FlowNode },
      { node_spec_name: "user_task", node_class: nodes.UserTaskNode },
      { node_spec_name: "script_task", node_class: nodes.ScriptTaskNode },
      { node_spec_name: "system_task", node_class: nodes.SystemTaskNode },
      { node_spec_name: "http_system_task", node_class: nodes.HttpSystemTaskNode },
      { node_spec_name: "set_to_bag_system_task", node_class: nodes.SetToBagSystemTaskNode },
      { node_spec_name: "timer_system_task", node_class: nodes.TimerSystemTaskNode },
      { node_spec_name: "start_process_system_task", node_class: nodes.StartProcessSystemTaskNode },
      { node_spec_name: "subprocess_task", node_class: nodes.SubProcessNode },
    ];

    for (const { node_spec_name, node_class } of nodes_samples_spec_class) {
      test(`Sample ${node_spec_name} is valid for ${node_class.name}`, () => {
        const node = new node_class(nodes_[node_spec_name]);
        const [is_valid] = node.validate();
        expect(is_valid).toEqual(true);
      });
    }
  });
});

describe("Nodes execution works", () => {
  test("Start works", async () => {
    const node = new nodes.StartNode(nodes_.start);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_start_result);
  });

  test("Finish works", async () => {
    const node = new nodes.FinishNode(nodes_.finish);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    expect(await node.run({ bag, input, external_input, parameters })).toMatchObject(results_.success_finish_result);
  });

  test("Flow works", async () => {
    const node = new nodes.FlowNode(nodes_.flow);

    const bag = { data: "bag" };
    const external_input = { data: "external" };
    let input = { next_node: "1", extra_data: "data" };
    let result = await node.run({ bag, input, external_input });
    expect(result.next_node_id).toBe("3");
    expect(result.result).toEqual(input);

    input = { next_node: "2", extra_data: "secondData" };
    result = await node.run({ bag, input, external_input });
    expect(result.next_node_id).toBe("4");
    expect(result.result).toEqual(input);
  });

  test("Flow $ref recognizes parameters", async () => {
    const node = new nodes.FlowNode(nodes_.flow_parameters);

    const bag = { data: "bag" };
    const external_input = { data: "external" };
    let parameters = { next_node: "data" };
    const input = { next_node: "1", extra_data: "data" };
    let result = await node.run({ bag, input, external_input, parameters });
    expect(result.next_node_id).toBe("3");
    expect(result.result).toEqual(input);

    parameters = { next_node: "whatever" };
    result = await node.run({ bag, input, external_input, parameters });
    expect(result.next_node_id).toBe("5");
    expect(result.result).toEqual(input);
  });

  test("SystemTaskNode works", async () => {
    const node = new nodes.SystemTaskNode(nodes_.system_task);

    const bag = { identity_system_data: "bag" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_system_task_result);
  });
});

describe("Pre and Post Processing tests", () => {
  test("ServiceTask should return error if namespace is not valid", async () => {
    const node = new nodes.SystemTaskNode(nodes_.invalid_namespace);

    const bag = { identity_system_data: "bag" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result.key).toBeUndefined();
  });

  test("Execution Data should be fetched correctly with multiple namespaces", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input.extra_key = { $ref: "result" };
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data_result: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ identity_system_data: { nested_key: "bag" }, extra_key: { ...input } });
  });

  test("Execution Data should be fetched correctly with multiple namespaces and conflicting keys", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input = {
      identity_system_data: { $ref: "bag.identity_system_data" },
      // eslint-disable-next-line no-dupe-keys
      identity_system_data: { $ref: "result.identity_system_data" },
    };
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    let result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ ...input });

    node_spec.parameters.input = {
      identity_system_data: { $ref: "result.identity_system_data" },
      // eslint-disable-next-line no-dupe-keys
      identity_system_data: { $ref: "bag.identity_system_data" },
    };
    result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ ...bag });
  });

  test("Execution Data should be fetched correctly with a single key", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    delete bag.test;
    expect(result.result).toStrictEqual(bag);
  });

  test("Execution Data should be fetched correctly with multiple keys", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input.test = { $ref: "bag.test" };
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" }, ignored: "string" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    delete bag.ignored;
    expect(result.result).toStrictEqual(bag);
  });

  test("Execution Data should be fetched correctly with a nested key", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input = { destiny_key: { $ref: "bag.identity_system_data.nested_key" } };
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ destiny_key: "bag" });
  });

  test("Execution Data should be fetched correctly with no path specified", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input = { destiny_key: { $ref: "bag" } };
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ destiny_key: { ...bag } });
  });

  test("Result should be returned as null for empty input", async () => {
    const node_spec = _.cloneDeep(nodes_.system_task);
    node_spec.parameters.input = {};
    const node = new nodes.SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({});
  });
});

describe("UserTaskNode", () => {
  test("UserTaskNode works when waiting", async () => {
    const node = new nodes.UserTaskNode(nodes_.user_task);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const external_input = null;
    const actor_data = {};
    const result = await node.run({ bag, input, external_input, actor_data });
    expect(result).toEqual(expect.objectContaining(results_.success_waiting_user_task_result));
  });

  test("UserTaskNode works", async () => {
    const node = new nodes.UserTaskNode(nodes_.user_task);

    const bag = { identity_user_data: "bag" };
    const input = { identity_user_data: "bag" };
    const external_input = { data: "external" };
    const actor_data = {};
    await node.run({ bag, input, external_input, actor_data });
    const result = await node.run({ bag, input, external_input, actor_data });
    expect(result).toMatchObject(results_.success_user_task_result);
  });

  describe("UserTaskNode encrypted_data works", () => {
    function getNode(encrypted_data) {
      const node_spec = _.cloneDeep(nodes_.user_task);
      node_spec.parameters.encrypted_data = encrypted_data;

      return new nodes.UserTaskNode(node_spec);
    }

    test("encrypt value", async () => {
      const user_task_node = getNode(["password"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { password: "senha" };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ password: "encryptedData" });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("encrypt nested value", async () => {
      const user_task_node = getNode(["user.password"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { password: "senha" } };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ user: { password: "encryptedData" } });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("encrypt multiple values", async () => {
      const user_task_node = getNode(["user.password", "value"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { password: "senha" }, value: 22 };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ user: { password: "encryptedData" }, value: "encryptedData" });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("no error with encrypted_data missing", async () => {
      const user_task_node = getNode(["user.password", "value"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { name: "username" } };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toStrictEqual(external_input);
        expect(result.result.value).toBeUndefined();
        expect(result.result.user.passwrod).toBeUndefined();

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });
  });

  test("Creates activity manager with parameter timeout", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.timeout = 10;

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { identity_user_data: "bag" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({ timeout: 10 });
  });

  test("Creates activity manager with parameter channel", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.channels = ["1"];

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "example_bag_data" };
    const input = { identity_user_data: "example_input_data" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({ channels: ["1"] });
  });

  test("Creates activity manager with parameter crypto", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.encrypted_data = ["password"];

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "example_bag_data" };
    const input = { identity_user_data: "example_input_data" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({
      encrypted_data: ["password"],
    });
  });

  test("Can reference actor_data on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $ref: "actor_data.id" };

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const external_input = null;
    const actor_data = { id: 22 };
    const result = await node.run({ bag, input, external_input, actor_data });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = 22;

    expect(result).toMatchObject(expected_result);
  });

  test("Can reference environment on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $mustache: "user of {{environment.node_env}}" };

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const actor_data = { id: 22 };
    const environment = {
      node_env: "test",
    };

    const result = await node.run({ bag, input, actor_data, environment });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = "user of test";

    expect(result).toMatchObject(expected_result);
  });

  test("Can reference parameters on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $mustache: "user of {{parameters.data}}" };

    const node = new nodes.UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const actor_data = { id: 22 };
    const environment = {};
    const parameters = { data: "params" };

    const result = await node.run({ bag, input, actor_data, environment, parameters });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = "user of params";

    expect(result).toMatchObject(expected_result);
  });
});

describe("ScriptTaskNode", () => {
  test("ScriptTaskNode works", async () => {
    const node = new nodes.ScriptTaskNode(nodes_.script_task);

    core_package = await Packages.fetchPackageByName("core");
    lisp.evaluate(core_package.code);

    const bag = { lisp_system_data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    expect(await node.run({ bag, input, external_input }, lisp)).toMatchObject(results_.success_script_task_result);
  });

  test("Can reference actor_data", async () => {
    const node_spec = _.cloneDeep(nodes_.script_task);
    node_spec.parameters.input.lisp_system_data = { $ref: "actor_data.id" };

    const node = new nodes.ScriptTaskNode(node_spec);

    core_package = await Packages.fetchPackageByName("core");
    lisp.evaluate(core_package.code);

    const bag = { lisp_system_data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const actor_data = { id: 99 };

    const response = await node.run({ bag, input, external_input, actor_data }, lisp);
    expect(response.result).toStrictEqual({ lisp_system_data: 99 });
  });

  test("Can reference environment", async () => {
    const node_spec = _.cloneDeep(nodes_.script_task);
    node_spec.parameters.input.lisp_system_data = { $ref: "environment.threshold" };

    const node = new nodes.ScriptTaskNode(node_spec);

    core_package = await Packages.fetchPackageByName("core");
    lisp.evaluate(core_package.code);

    const bag = { lisp_system_data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const actor_data = { id: 99 };
    const environment = { threshold: 1000 };

    const response = await node.run({ bag, input, external_input, actor_data, environment }, lisp);
    expect(response.result).toStrictEqual({ lisp_system_data: 1000 });
  });
});

describe("HttpSystemTaskNode", () => {
  test("HttpSystemTaskNode works with GET", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = "GET";
    const node = new nodes.HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_get_http_result);
  });

  test("HttpSystemTaskNode works with POST", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = "POST";
    const node = new nodes.HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_post_http_result);
  });

  test("HttpSystemTaskNode works with DELETE", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = "DELETE";
    const node = new nodes.HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_delete_http_result);
  });

  test("HttpSystemTaskNode works with $mustache", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = { $mustache: "DELETE" };
    const node = new nodes.HttpSystemTaskNode(node_spec);
    expect(node.validate()[0]).toBeTruthy();
    expect(node.id).toBe(node_spec.id);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(results_.success_delete_http_result);
  });

  test("HttpSystemTaskNode works with $ref bag", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = { $ref: "bag.verb" };
    const node = new nodes.HttpSystemTaskNode(node_spec);
    expect(node.validate()[0]).toBeTruthy();
    expect(node.id).toBe(node_spec.id);

    const bag = { payload: { dummy: "payload" }, verb: "DELETE" };
    const input = {};
    const external_input = {};

    const result = await node.run({ bag, input, external_input });

    const expected_result = _.cloneDeep(results_.success_delete_http_result);
    expected_result.bag = bag;
    expect(result).toMatchObject(expected_result);
  });

  test("HttpSystemTaskNode works with $ref actor_data", async () => {
    const node_spec = nodes_.http_system_task;
    node_spec.parameters.request.verb = { $ref: "actor_data.verb" };
    const node = new nodes.HttpSystemTaskNode(node_spec);
    expect(node.validate()[0]).toBeTruthy();
    expect(node.id).toBe(node_spec.id);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    const actor_data = { verb: "DELETE" };
    expect(await node.run({ bag, input, external_input, actor_data })).toMatchObject(
      results_.success_delete_http_result
    );
  });

  test("Can reference actor_data", async () => {
    try {
      let calledEndpoint;
      let calledPayload;
      axios.__customResponse("post", (endpoint, payload) => {
        calledEndpoint = endpoint;
        calledPayload = payload;
        return { status: 200, data: { response: "ok" } };
      });

      const node_spec = _.cloneDeep(nodes_.http_system_task);
      node_spec.parameters.request.verb = "POST";
      node_spec.parameters.input.payload = { $ref: "actor_data.claims" };
      const node = new nodes.HttpSystemTaskNode(node_spec);

      const bag = { bagData: "exampleBagData" };
      const input = {};
      const actor_data = { claims: ["user"] };
      const response = await node.run({ bag, input, actor_data });
      expect(response.result).toBeDefined();
      expect(response.result.status).toEqual(200);
      expect(response.result.data).toEqual({ response: "ok" });
      expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
      expect(calledPayload).toEqual({ payload: actor_data.claims });
    } finally {
      axios.__clearCustomResponse("post");
    }
  });

  test("Can reference environment on request and input", async () => {
    try {
      let calledEndpoint;
      let calledPayload;
      axios.__customResponse("post", (endpoint, payload) => {
        calledEndpoint = endpoint;
        calledPayload = payload;
        return { status: 200, data: { response: "ok" } };
      });

      const node_spec = _.cloneDeep(nodes_.http_system_task);
      node_spec.parameters.request.verb = "POST";
      node_spec.parameters.input.payload = { $mustache: "{{environment.threshold}}" };
      node_spec.parameters.request.url = { $ref: "environment.api_url" };
      const node = new nodes.HttpSystemTaskNode(node_spec);

      const bag = { payload: "data" };
      const environment = { api_url: "127.0.1.1", threshold: 999 };
      const response = await node.run({ bag, environment });

      expect(response.result).toBeDefined();
      expect(response.result.status).toEqual(200);
      expect(response.result.data).toEqual({ response: "ok" });
      expect(calledEndpoint).toEqual("127.0.1.1");
      expect(calledPayload).toEqual({ payload: "999" });
    } finally {
      axios.__clearCustomResponse("post");
    }
  });

  test("Invalid response code", async () => {
    const node_spec = _.cloneDeep(nodes_.http_system_task);
    node_spec.parameters.valid_response_codes = [202];
    node_spec.parameters.request.verb = "GET";

    const node = new nodes.HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    const node_result = await node.run({ bag, input, external_input });

    expect(node_result.status).toEqual(ProcessStatus.ERROR);
    expect(node_result.result).toBeNull();
  });

  describe("httpTimeout", () => {
    const axios_methods = ["post", "get", "delete", "patch", "put", "head"];

    for (const axios_method of axios_methods) {
      test(`${axios_method.toUpperCase()} Timeout uses ENV HTTP_TIMEOUT`, async () => {
        try {
          process.env.HTTP_TIMEOUT = "10000";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(10000);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.HTTP_TIMEOUT;
        }
      });

      test(`${axios_method.toUpperCase()} If ENV HTTP_TIMEOUT invalid uses 0`, async () => {
        try {
          process.env.HTTP_TIMEOUT = "abc";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.HTTP_TIMEOUT;
        }
      });

      test(`${axios_method.toUpperCase()} If no config uses 0`, async () => {
        try {
          expect(process.env.HTTP_TIMEOUT).toBeUndefined();
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout configured on blueprint`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.timeout = "22";
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(22);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout default if blueprint config is invalid`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.timeout = "abc";
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });
    }
  });

  describe("maxContentLength", () => {
    const axios_methods = ["post", "get", "delete", "patch", "put", "head"];

    for (const axios_method of axios_methods) {
      test(`${axios_method.toUpperCase()} maxContentLength uses ENV MAX_CONTENT_LENGTH`, async () => {
        try {
          process.env.MAX_CONTENT_LENGTH = "10";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "12345678901" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "12345678901" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(10);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.MAX_CONTENT_LENGTH;
        }
      });

      test(`${axios_method.toUpperCase()} If ENV HTTP_TIMEOUT invalid uses default`, async () => {
        try {
          process.env.MAX_CONTENT_LENGTH = "abc";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(2000);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.MAX_CONTENT_LENGTH;
        }
      });

      test(`${axios_method.toUpperCase()} Uses max_content_length configured on blueprint`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.max_content_length = "22";
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(22);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout default if blueprint config is invalid`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(nodes_.http_system_task);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.max_coontent_length = "abc";
          const node = new nodes.HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(2000);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });
    }
  });
});

describe("SetToBagSystemTaskNode", () => {
  test("SetToBagTaskNode works", async () => {
    const node = new nodes.SetToBagSystemTaskNode(nodes_.set_to_bag_system_task);

    const bag = {};
    const input = { set_to_bag_data: "result" };
    const external_input = {};
    const result = await node.run({ bag, input, external_input });
    expect(result.bag).toStrictEqual({ destination_key: "result" });
    expect(result.result).toStrictEqual(input);
  });

  test("Shouldn't change bag for empty input", async () => {
    const node_spec = _.cloneDeep(nodes_.set_to_bag_system_task);
    node_spec.parameters.input = {};
    const node = new nodes.SetToBagSystemTaskNode(node_spec);
    expect(node.validate()[0]).toBeTruthy();
    expect(node.id).toBe(node_spec.id);

    const bag = {};
    const input = { set_to_bag_data: "result" };
    const external_input = {};
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual(input);
    expect(result.bag).toStrictEqual(bag);
  });

  test("Can reference actor_data", async () => {
    const node_spec = _.cloneDeep(nodes_.set_to_bag_system_task);
    node_spec.parameters.input.destination_key = { $ref: "actor_data.id" };
    const node = new nodes.SetToBagSystemTaskNode(node_spec);

    const bag = { bagData: "exampleBagData" };
    const input = { inputData: "exampleInputData" };
    const actor_data = { id: "actorId" };
    const result = await node.run({ bag, input, actor_data });
    expect(result.result).toStrictEqual(input);
    expect(result.bag).toStrictEqual({ bagData: "exampleBagData", destination_key: "actorId" });
  });
});

describe("StartNode", () => {
  test("Node validate input_schema is a valid ajv schema", () => {
    const node_spec = _.cloneDeep(nodes_.start);
    node_spec.parameters.input_schema = {
      type: "unknowType",
    };
    const node = new nodes.StartNode(node_spec);

    const [is_valid, error] = node.validate();
    expect(is_valid).toEqual(false);
    expect(error).toBeTruthy();
  });

  test("Run status error if input don't match input_schema", async () => {
    const node_spec = _.cloneDeep(nodes_.start);
    node_spec.parameters.input_schema = {
      type: "string",
    };
    const node = new nodes.StartNode(node_spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const node_result = await node.run({ bag, input, external_input });
    expect(node_result.status).toEqual(ProcessStatus.ERROR);
    expect(node_result.error).toMatch("Error: data must be string");
  });

  test("Run status running with result error if on_error 'resumeNext", async () => {
    const node_spec = _.cloneDeep(nodes_.start);
    node_spec.parameters.input_schema = {
      type: "string",
    };
    node_spec.on_error = "resumeNext";
    const node = new nodes.StartNode(node_spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const node_result = await node.run({ bag, input, external_input });
    expect(node_result.status).toEqual(ProcessStatus.RUNNING);
    expect(node_result.bag).toEqual(bag);
    expect(node_result.external_input).toEqual(external_input);
    expect(node_result.error).toBeNull();
    expect(node_result.result.is_error).toEqual(true);
    expect(node_result.result.error).toMatch("Error: data must be string");
  });

  test("Valid input_schema", async () => {
    const node_spec = _.cloneDeep(nodes_.start);
    node_spec.parameters.input_schema = {
      type: "object",
      properties: {
        data: { type: "string" },
        additionalProperties: false,
      },
    };
    const node = new nodes.StartNode(node_spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const node_result = await node.run({ bag, input, external_input });
    expect(node_result).toMatchObject(results_.success_start_result);
  });

  test("With Timeout pops the timeout parameter up", async () => {
    const node_spec = _.cloneDeep(nodes_.start_w_timeout);

    const node = new nodes.StartNode(node_spec);

    const bag = { data: "bag" };
    const input = { data: "input" };
    const external_input = { data: "external" };

    const node_result = await node.run({ bag, input, external_input });

    expect(node_result).toMatchObject(results_.success_start_result_w_timeout);
  });
});

describe("TimerSystemTaskNode", () => {
  test("Validate parameters", () => {
    const node_spec = _.cloneDeep(nodes_.timer_system_task);
    delete node_spec.parameters.timeout;
    const node = new nodes.TimerSystemTaskNode(node_spec);

    const [validate_result, reason] = node.validate();

    expect(validate_result).toEqual(false);
    expect(reason).toEqual("parameters_has_timeout");
  });

  test("Timer node puts the process on PENDING and pops the timeout parameter up", async () => {
    const node_spec = _.cloneDeep(nodes_.timer_system_task);

    const node = new nodes.TimerSystemTaskNode(node_spec);

    const bag = {
      sample: "data",
    };
    const input = {
      input: "value",
    };
    const result = await node.run({ bag, input });

    expect(result).toMatchObject({
      node_id: node_spec.id,
      next_node_id: node_spec.next,
      bag: bag,
      status: ProcessStatus.PENDING,
      result: { timeout: node_spec.parameters.timeout },
      external_input: {},
      error: null,
    });
  });
});

describe("StartProcessSystemTaskNode", () => {
  describe("Validations", () => {
    let node_spec;
    beforeEach(() => {
      node_spec = _.cloneDeep(nodes_.start_process_system_task);
    });

    test("parameters_has_workflow_name", () => {
      delete node_spec.parameters.workflow_name;

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(false);
      expect(reason).toEqual("parameters_has_workflow_name");
    });

    test("parameters_workflow_name_has_valid_type accepts string", () => {
      node_spec.parameters.workflow_name = "22";

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(true);
      expect(reason).toBeNull();
    });

    test("parameters_workflow_name_has_valid_type accepts object", () => {
      node_spec.parameters.workflow_name = {
        $ref: "result.value",
      };

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(true);
      expect(reason).toBeNull();
    });

    test("parameters_workflow_name_has_valid_type reject number", () => {
      node_spec.parameters.workflow_name = 22;

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(false);
      expect(reason).toEqual("parameters_workflow_name_has_valid_type");
    });

    test("parameters_has_actor_data", () => {
      delete node_spec.parameters.actor_data;

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(false);
      expect(reason).toEqual("parameters_has_actor_data");
    });

    test("parameters_actor_data_has_valid_type", () => {
      node_spec.parameters.actor_data = "1";

      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(false);
      expect(reason).toEqual("parameters_actor_data_has_valid_type");
    });
  });

  test("creates and run process by engine", async () => {
    let original_createProcessByWorkflowName = process_manager.createProcessByWorkflowName;
    let original_runProcess = process_manager.runProcess;
    try {
      const process_id = "9090";
      const mock_createProcessByWorkflowName = jest.fn().mockResolvedValue({
        id: process_id,
      });
      const mock_runProcess = jest.fn();

      process_manager.createProcessByWorkflowName = mock_createProcessByWorkflowName;
      process_manager.runProcess = mock_runProcess;

      const node_spec = nodes_.start_process_system_task;
      const node = new nodes.StartProcessSystemTaskNode(node_spec);

      const result = await node.run({});

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);
      expect(result.result).toEqual({ process_id: process_id });

      const expected_workflow_name = node_spec.parameters.workflow_name;
      const expected_workflow_actor_data = {};
      const expected_workfow_input = {
        parent_process_data: {
          id: null,
        },
      };

      expect(mock_createProcessByWorkflowName).toBeCalledTimes(1);
      expect(mock_createProcessByWorkflowName).toBeCalledWith(
        expected_workflow_name,
        expected_workflow_actor_data,
        expected_workfow_input
      );

      expect(mock_runProcess).toBeCalledTimes(1);
      expect(mock_runProcess).toBeCalledWith(process_id, expected_workflow_actor_data);
    } finally {
      process_manager.createProcessByWorkflowName = original_createProcessByWorkflowName;
      process_manager.runProcess = original_runProcess;
    }
  });

  describe("preProcess workflow data", () => {
    let original_createProcessByWorkflowName = process_manager.createProcessByWorkflowName;
    let original_runProcess = process_manager.runProcess;
    let mock_createProcessByWorkflowName = jest.fn().mockResolvedValue({
      id: "1239",
    });
    let mock_runProcess = jest.fn();
    let node_spec = nodes_.start_process_system_task;

    beforeEach(() => {
      mock_createProcessByWorkflowName.mockClear();
      mock_runProcess.mockClear();

      process_manager.createProcessByWorkflowName = mock_createProcessByWorkflowName;
      process_manager.runProcess = mock_runProcess;

      node_spec = _.cloneDeep(nodes_.start_process_system_task);
    });

    afterEach(() => {
      process_manager.createProcessByWorkflowName = original_createProcessByWorkflowName;
      process_manager.runProcess = original_runProcess;
    });

    describe("workflow_name", () => {
      test("$ref bag", async () => {
        node_spec.parameters.workflow_name = { $ref: "bag.workflow_name" };

        const node = new nodes.StartProcessSystemTaskNode(node_spec);
        const result = await node.run({
          bag: {
            workflow_name: "bag_workflow_name",
          },
        });

        expect(result).toBeDefined();
        expect(result.status).toEqual(ProcessStatus.RUNNING);

        expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
          "bag_workflow_name",
          {},
          {
            parent_process_data: {
              id: null,
            },
          }
        );
      });

      test("$ref result", async () => {
        node_spec.parameters.workflow_name = { $ref: "result.workflow_name" };

        const node = new nodes.StartProcessSystemTaskNode(node_spec);
        const result = await node.run({
          input: {
            workflow_name: "result_workflow_name",
          },
        });

        expect(result).toBeDefined();
        expect(result.status).toEqual(ProcessStatus.RUNNING);

        expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
          "result_workflow_name",
          {},
          {
            parent_process_data: {
              id: null,
            },
          }
        );
      });

      test("$mustache result", async () => {
        node_spec.parameters.workflow_name = { $mustache: "ATV_{{result.workflow_name}}" };

        const node = new nodes.StartProcessSystemTaskNode(node_spec);
        const result = await node.run({
          input: {
            workflow_name: "result_workflow_name",
          },
        });

        expect(result).toBeDefined();
        expect(result.status).toEqual(ProcessStatus.RUNNING);

        expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
          "ATV_result_workflow_name",
          {},
          {
            parent_process_data: {
              id: null,
            },
          }
        );
      });
    });

    describe("actor_data", () => {
      test("$ref actor_data", async () => {
        node_spec.parameters.actor_data = { $ref: "actor_data" };

        const node = new nodes.StartProcessSystemTaskNode(node_spec);
        const result = await node.run({
          actor_data: {
            id: "id_node_runner",
          },
        });

        expect(result).toBeDefined();
        expect(result.status).toEqual(ProcessStatus.RUNNING);

        expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
          "example_workflow",
          {
            id: "id_node_runner",
          },
          {
            parent_process_data: {
              id: null,
            },
          }
        );
      });

      test("$ref environment", async () => {
        node_spec.parameters.actor_data = { $ref: "environment.actor" };

        const node = new nodes.StartProcessSystemTaskNode(node_spec);
        const result = await node.run({
          environment: {
            actor: {
              id: "id_environment",
            },
          },
          process_id: "1234",
        });

        expect(result).toBeDefined();
        expect(result.status).toEqual(ProcessStatus.RUNNING);

        expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
          "example_workflow",
          {
            id: "id_environment",
          },
          {
            parent_process_data: {
              id: "1234",
            },
          }
        );
      });
    });

    test("input prepare", async () => {
      node_spec.parameters.input = {
        creator: { $ref: "actor_data.id" },
        data: { $ref: "result.data" },
        key: { $mustache: "user-{{bag.value}}" },
        flag: { $ref: "environment.active" },
        total: { $js: "() => 2 + 3" },
      };

      const node = new nodes.StartProcessSystemTaskNode(node_spec);
      const result = await node.run({
        bag: {
          value: "example_bag_value",
        },
        actor_data: {
          id: "id_node_runner",
        },
        input: {
          data: "example_result_data",
        },
        environment: {
          active: "true",
        },
        process_id: "1234",
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "example_workflow",
        {},
        {
          creator: "id_node_runner",
          data: "example_result_data",
          key: "user-example_bag_value",
          flag: "true",
          total: 5,
          parent_process_data: {
            id: "1234",
          },
        }
      );
    });
  });
});

describe("AbortProcessSystemTaskNode", () => {
  describe("Validations", () => {
    let node_spec;
    beforeEach(() => {
      node_spec = _.cloneDeep(nodes_.abort_process_system_task);
    });

    test("accepts input as array process_ids", () => {
      node_spec.parameters.input = [uuid()];

      const node = new nodes.AbortProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(true);
      expect(reason).toBeNull();
    });

    test("accepts input as $ref", () => {
      node_spec.parameters.input = {
        $ref: "result.process",
      };

      const node = new nodes.AbortProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(true);
      expect(reason).toBeNull();
    });
  });

  describe("run", () => {
    const original_abortProcess = process_manager.abortProcess;
    let mock_abortProcess = jest.fn();

    beforeEach(() => {
      mock_abortProcess.mockReset();

      process_manager.abortProcess = mock_abortProcess;
    });

    afterAll(() => {
      process_manager.abortProcess = original_abortProcess;
    });

    test("calls process_manager abortProcess", async () => {
      const process_id = uuid();

      const abort_result = [
        {
          status: "fulfilled",
        },
      ];
      mock_abortProcess.mockResolvedValue(abort_result);

      const node_spec = _.cloneDeep(nodes_.abort_process_system_task);
      node_spec.parameters.input = [process_id];

      const node = new nodes.AbortProcessSystemTaskNode(node_spec);

      const result = await node.run({});
      expect(result.status).toEqual(ProcessStatus.RUNNING);
      expect(result.result).toEqual({
        [process_id]: "fulfilled",
      });

      expect(mock_abortProcess).toHaveBeenNthCalledWith(1, [process_id]);
    });

    test("calls process_manager abortProcess with $ref", async () => {
      const process_list = [uuid(), uuid()];

      const abort_result = [
        {
          status: "fulfilled",
        },
        {
          status: "rejected",
        },
      ];
      mock_abortProcess.mockResolvedValue(abort_result);

      const node_spec = _.cloneDeep(nodes_.abort_process_system_task);
      node_spec.parameters.input = {
        $ref: "result.process_list",
      };

      const node = new nodes.AbortProcessSystemTaskNode(node_spec);

      const result = await node.run({ input: { process_list } });
      expect(result.status).toEqual(ProcessStatus.RUNNING);
      expect(result.result).toEqual({
        [process_list[0]]: "fulfilled",
        [process_list[1]]: "rejected",
      });

      expect(mock_abortProcess).toHaveBeenNthCalledWith(1, process_list);
    });
  });
});
