const { ParameterizedNode } = require("../parameterized");
const examples = require("../examples/parameterized");
const _ = require("lodash");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = ParameterizedNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.parameters.properties.input).toBeDefined();
  });
});

describe("static Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec["id"];
    const [isValid, error] = ParameterizedNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have an parameters.input", () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec.parameters["input"];
    const [isValid, error] = ParameterizedNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'input'");
  });
});

describe("Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec["id"];
    const node = new ParameterizedNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have an parameters.input", () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec.parameters["input"];
    const node = new ParameterizedNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'input'");
  });
});
