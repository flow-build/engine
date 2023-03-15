const _ = require("lodash");
const { minimal, successResult } = require("../examples/finish");
const { FinishNode } = require("../finish");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = FinishNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("null");
  });
});

describe("static Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["id"];
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("next must be null", () => {
    const spec = _.cloneDeep(minimal);
    spec.next = "123";
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("next/type");
    expect(error).toMatch("must be null");
  });

  test("parameters is not required", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters;
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toBeTruthy();
    expect(error).toBe("null");
  });
});

describe("Execution", () => {
  test("it works", async () => {
    const node = new FinishNode(minimal);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    const nodeResult = await node.run({ bag, input, external_input, parameters });
    expect(nodeResult).toMatchObject(successResult);
  });
});
