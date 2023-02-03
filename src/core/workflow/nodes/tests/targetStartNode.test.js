const { TargetStartNode } = require("../targetStart");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = TargetStartNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("string");
    expect(schema.properties.parameters).toBeDefined();
    expect(schema.properties.parameters.properties.input_schema).toBeDefined();
    expect(schema.properties.parameters.required[0]).toBe("input_schema");
    expect(schema.properties.parameters.properties.signal).toBeDefined();
    expect(schema.properties.parameters.required[1]).toBe("signal");
  });
});
