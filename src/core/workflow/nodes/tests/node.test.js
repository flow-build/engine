const { Node } = require("../node");
const { minimal } = require("../examples/nodes");
const _ = require("lodash");

describe("static Schema", () => {
  test("Should merge Node and SystemTaskNode schema", async () => {
    const schema = Node.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.name).toBeDefined();
    expect(schema.properties.type).toBeDefined();
    expect(schema.properties.lane_id).toBeDefined();
    expect(schema.properties.on_error).toBeDefined();
    expect(schema.properties.parameters).toBeDefined();
  });
});

describe("Validate", () => {
  test("Must have an id", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["id"];
    const node = new Node(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toBeFalsy();
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have a name", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["name"];
    const node = new Node(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toBeFalsy();
    expect(error).toMatch("must have required property 'name'");
  });

  test("Must have a type", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["type"];
    const node = new Node(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toBeFalsy();
    expect(error).toMatch("must have required property 'type'");
  });

  test("Must have a lane_id", () => {
    const spec = _.cloneDeep(minimal);
    delete spec["lane_id"];
    const node = new Node(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toBeFalsy();
    expect(error).toMatch("must have required property 'lane_id'");
  });
});
