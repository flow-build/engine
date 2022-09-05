const { SubProcessNode } = require("../subProcess");

describe("static Schema", () => {
  test("Should merge Node and UserTaskNode schema", async () => {
    const schema = SubProcessNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next.type).toBe("string");
    expect(schema.properties.parameters.required).toEqual(
      expect.arrayContaining(["actor_data", "input", "workflow_name"])
    );
  });
});
