const { SystemTaskNode } = require("../systemTask");
const { minimal, successResult } = require("../examples/systemTask");
const _ = require("lodash");
const { invalidNamespace } = require("../examples/nodes");

describe("static Schema", () => {
  test("Should merge Node and SystemTaskNode schema", async () => {
    const schema = SystemTaskNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.parameters.properties.input).toBeDefined();
  });
});

describe("static Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["id"];
    const [isValid, error] = SystemTaskNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have an category", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.category;
    const [isValid, error] = SystemTaskNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'category'");
  });

  test("Must have an parameters.input", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters["input"];
    const [isValid, error] = SystemTaskNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'input'");
  });
});

describe("Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["id"];
    const node = new SystemTaskNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have an parameters.input", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters["input"];
    const node = new SystemTaskNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'input'");
  });
});

describe("Execution", () => {
  test("SystemTaskNode works", async () => {
    const node = new SystemTaskNode(minimal);

    const bag = { identity_system_data: "bag" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const nodeResult = await node.run({ bag, input, external_input });
    expect(nodeResult).toMatchObject(successResult);
  });
});

describe("Pre and Post Processing tests", () => {
  test("ServiceTask should return error if namespace is not valid", async () => {
    const node = new SystemTaskNode(invalidNamespace);

    const bag = { identity_system_data: "bag" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result.key).toBeUndefined();
  });

  test("Execution Data should be fetched correctly with multiple namespaces", async () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.input.extra_key = { $ref: "result" };
    const node = new SystemTaskNode(spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data_result: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ identity_system_data: { nested_key: "bag" }, extra_key: { ...input } });
  });

  test("Execution Data should be fetched correctly with multiple namespaces and conflicting keys", async () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.input = {
      identity_system_data: { $ref: "bag.identity_system_data" },
      // eslint-disable-next-line no-dupe-keys
      identity_system_data: { $ref: "result.identity_system_data" },
    };
    const node = new SystemTaskNode(spec);

    const bag = { identity_system_data: { nested_key: "bag" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    let result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ ...input });

    spec.parameters.input = {
      identity_system_data: { $ref: "result.identity_system_data" },
      // eslint-disable-next-line no-dupe-keys
      identity_system_data: { $ref: "bag.identity_system_data" },
    };
    result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ ...bag });
  });

  test("Execution Data should be fetched correctly with a single key", async () => {
    const node_spec = _.cloneDeep(minimal);
    const node = new SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    delete bag.test;
    expect(result.result).toStrictEqual(bag);
  });

  test("Execution Data should be fetched correctly with multiple keys", async () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input.test = { $ref: "bag.test" };
    const node = new SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" }, ignored: "string" };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    delete bag.ignored;
    expect(result.result).toStrictEqual(bag);
  });

  test("Execution Data should be fetched correctly with a nested key", async () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input = { destiny_key: { $ref: "bag.identity_system_data.nested_key" } };
    const node = new SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ destiny_key: "bag" });
  });

  test("Execution Data should be fetched correctly with no path specified", async () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input = { destiny_key: { $ref: "bag" } };
    const node = new SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({ destiny_key: { ...bag } });
  });

  test("Result should be returned as null for empty input", async () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input = {};
    const node = new SystemTaskNode(node_spec);

    const bag = { identity_system_data: { nested_key: "bag" }, test: { any: "any" } };
    const input = { identity_system_data: "result" };
    const external_input = { data: "external" };
    const result = await node.run({ bag, input, external_input });
    expect(result.result).toStrictEqual({});
  });
});
