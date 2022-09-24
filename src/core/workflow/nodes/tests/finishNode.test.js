const _ = require("lodash");
const { minimal, successResult } = require("../examples/finish");
const { FinishNode } = require("../finish");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = FinishNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("null");
    expect(schema.properties.triggers).toBeDefined();
    expect(schema.properties.triggers.type).toBe("array");
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

describe("triggers validation", () => {
  test("must not accept a triggers outside defined values", () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["whatever"];
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("enum");
  });

  test("must accept a single trigger", () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["error"];
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toBeTruthy();
    expect(error).toBe("null");
  });

  test("must accept multiple triggers", () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["error", "escalation"];
    const [isValid, error] = FinishNode.validate(spec);
    expect(isValid).toBeTruthy();
    expect(error).toBe("null");
  });

  test("must not accept duplicated triggers", () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["error", "escalation", "error"];
    const node = new FinishNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("uniqueItems");
  });
});

describe("preProcessing & triggers", () => {
  test("returns triggers even if no parameters is defined", async () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters;
    spec.triggers = ["error", "escalation"];
    const node = new FinishNode(spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    const result = node._preProcessing({ bag, input, external_input, parameters });
    expect(result.triggers).toBeDefined();
    expect(result.triggers).toEqual(spec.triggers);
  });

  test("omits triggers if not specified", async () => {
    const spec = _.cloneDeep(minimal);
    const node = new FinishNode(spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    const result = node._preProcessing({ bag, input, external_input, parameters });
    expect(result).toEqual(successResult.result);
    expect(result.triggers).toBeUndefined();
  });

  test("merges triggers and result", async () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["error", "escalation"];
    const node = new FinishNode(spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    const result = node._preProcessing({ bag, input, external_input, parameters });
    expect(result.bagRef).toEqual(successResult.result.bagRef);
    expect(result.triggers).toEqual(spec.triggers);
  });

  test("if parameters defines a triggers property, overwrites spec", async () => {
    const spec = _.cloneDeep(minimal);
    spec.triggers = ["error", "escalation"];
    spec.parameters.input.triggers = "whatever";
    const node = new FinishNode(spec);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params" };
    const result = node._preProcessing({ bag, input, external_input, parameters });
    expect(result.bagRef).toEqual(successResult.result.bagRef);
    expect(result.triggers).toEqual("whatever");
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
