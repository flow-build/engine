const { SystemTaskNode } = require("../systemTask");
const { minimal, successResult } = require("../examples/systemTask");
const _ = require("lodash");

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
