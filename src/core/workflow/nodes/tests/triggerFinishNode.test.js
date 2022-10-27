const _ = require("lodash");
const { minimal, successResult } = require("../examples/triggerFinish");
const { TriggerFinishNode } = require("../triggerFinish");

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = TriggerFinishNode.schema;
    console.log(schema.required);
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("null");
    expect(schema.properties.parameters).toBeDefined();
    expect(schema.properties.parameters.properties.signal).toBeDefined();
    expect(schema.properties.parameters.properties.input).toBeDefined();
  });
});

describe("Execution", () => {
  test("it works", async () => {
    const node = new TriggerFinishNode(minimal);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const parameters = { data: "params", signal: "test_signal" };
    const nodeResult = await node.run({ bag, input, external_input, parameters });
    expect(nodeResult).toMatchObject(successResult);
  });
});
