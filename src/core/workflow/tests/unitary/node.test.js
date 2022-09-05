const _ = require("lodash");
const { v1: uuid } = require("uuid");
const lisp = require("../../../lisp");
const nodes = require("../../../workflow/nodes/index.js");
const settings = require("../../../../../settings/tests/settings");
const { Packages } = require("../../../workflow/packages");
const { PersistorProvider } = require("../../../persist/provider");
const { ProcessStatus } = require("../../../workflow/process_state");
const process_manager = require("../../process_manager");
const { nodes_, results_ } = require("./node_samples");

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
      { node_spec: nodes_.script_task, node: nodes.ScriptTaskNode },
      { node_spec: nodes_.set_to_bag_system_task, node: nodes.SetToBagSystemTaskNode },
    ];

    for (const { node_spec, node } of spec_base_node_constraint) {
      test(`Node ${node.name} has_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["id"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'id'");
      });

      test(`Node ${node.name} has_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["type"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'type'");
      });

      test(`Node ${node.name} has_name constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["name"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'name'");
      });

      test(`Node ${node.name} has_next constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["next"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'next'");
      });

      test(`Node ${node.name} has_lane_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        delete spec["lane_id"];
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'lane_id'");
      });

      test(`Node ${node.name} id_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.id = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must be string");
      });

      test(`Node ${node.name} type_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.type = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must be string");
      });

      test(`Node ${node.name} next_has_valid_type constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.next = undefined;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must have required property 'next'");
      });

      test(`Node ${node.name} lane_id_has_valid_lane_id constraint works`, () => {
        const spec = _.cloneDeep(node_spec);
        spec.lane_id = null;
        const [is_valid, error] = node.validate(spec);
        expect(is_valid).toEqual(false);
        expect(error).toMatch("must be string");
      });
    }
  });

  describe("ScriptTaskNode", () => {
    test("ScriptTaskNode parameters_has_script constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      delete spec.parameters["script"];
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toMatch("must have required property 'script'");
    });

    test("ScriptTaskNode parameters_script_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      spec.parameters.script = undefined;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toMatch("must have required property 'script'");
    });

    test("ScriptTaskNode script_has_function constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      delete spec.parameters.script.function;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toMatch("must have required property 'function'");
    });

    test("ScriptTaskNode script_args_has_valid_type constraint works", () => {
      const spec = _.cloneDeep(nodes_.script_task);
      spec.parameters.script.args = 1;
      const [is_valid, error] = nodes.ScriptTaskNode.validate(spec);
      expect(is_valid).toEqual(false);
      expect(error).toMatch("must be object");
    });
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
      expect(reason).toBe("null");
    });

    test("accepts input as $ref", () => {
      node_spec.parameters.input = {
        $ref: "result.process",
      };

      const node = new nodes.AbortProcessSystemTaskNode(node_spec);

      const [is_valid, reason] = node.validate();

      expect(is_valid).toEqual(true);
      expect(reason).toBe("null");
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
