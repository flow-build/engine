const _ = require("lodash");
const { TimerSystemTaskNode } = require("../timer");
const { timeoutNumber, timeoutObject } = require("../examples/timer");
const { ProcessStatus } = require("../../process_state");

describe("static Schema", () => {
  test("Should merge Node and SystemTaskNode schema", async () => {
    const schema = TimerSystemTaskNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.parameters.required[0]).toBe("timeout");
    expect(schema.properties.parameters.properties.timeout).toBeDefined();
  });
});

describe("static Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(timeoutNumber);
    delete spec["id"];
    const [isValid, error] = TimerSystemTaskNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("Must have an parameters.timeout", () => {
    const spec = _.cloneDeep(timeoutNumber);
    delete spec.parameters["timeout"];
    const [isValid, error] = TimerSystemTaskNode.validate(spec);
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'timeout'");
  });

  test("parameters.timeout can be and object", () => {
    const spec = _.cloneDeep(timeoutObject);
    const [isValid, error] = TimerSystemTaskNode.validate(spec);
    expect(isValid).toBeTruthy();
    expect(error).toBe("null");
  });
});

describe("Validate", () => {
  test("Heritage from Node: Must have an id", () => {
    const spec = _.cloneDeep(timeoutNumber);
    delete spec["id"];
    const node = new TimerSystemTaskNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(false);
    expect(error).toMatch("must have required property 'id'");
  });

  test("May not have have an parameters.input", () => {
    const spec = _.cloneDeep(timeoutNumber);
    delete spec.parameters["input"];
    const node = new TimerSystemTaskNode(spec);
    const [isValid, error] = node.validate();
    expect(isValid).toEqual(true);
    expect(error).toBe("null");
  });
});

describe("Execution", () => {
  test("Timer node puts the process on PENDING and pops the timeout parameter up", async () => {
    const spec = _.cloneDeep(timeoutNumber);

    const node = new TimerSystemTaskNode(spec);

    const bag = { sample: "data" };
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toBe(spec.parameters.timeout);
  });

  test("Timer node works with $ref", async () => {
    const spec = _.cloneDeep(timeoutObject);

    const node = new TimerSystemTaskNode(spec);

    const bag = { sample: 10 };
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toBe(bag.sample);
  });
});
