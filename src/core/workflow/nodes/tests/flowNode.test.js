const _ = require("lodash");
const { minimal, fromParameters } = require("../examples/flow");
const { FlowNode } = require("../flow");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = FlowNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("object");
    expect(schema.properties.parameters).toBeDefined();
  });
});

describe("validation", () => {
  test("next should be object", () => {
    const spec = _.cloneDeep(minimal);
    spec.next = "123";
    const [is_valid, error] = FlowNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/next");
    expect(error).toMatch("must be object");
  });

  test("must have parameters", () => {
    const node_spec = _.cloneDeep(minimal);
    delete node_spec.parameters;
    const [is_valid, error] = FlowNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'parameters'");
  });

  test("parameters should be an object", () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters = 22;
    const [is_valid, error] = FlowNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/parameters");
    expect(error).toMatch("must be object");
  });

  test("parameters must have input", () => {
    const node_spec = _.cloneDeep(minimal);
    delete node_spec.parameters.input;
    const [is_valid, error] = FlowNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'input'");
  });

  test("input must be an object", () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.input = "";
    const [is_valid, error] = FlowNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/input");
    expect(error).toMatch("must be object");
  });

  test("input must have only one key an object", () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input_schema = {
      a: "any",
      b: "other",
    };
    const [is_valid, error] = FlowNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("parameters/maxProperties");
  });
});

describe("execution", () => {
  test("Flow works", async () => {
    const node = new FlowNode(minimal);

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
    const node = new FlowNode(fromParameters);

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
});
