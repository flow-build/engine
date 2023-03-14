const _ = require("lodash");
const { TimerSystemTaskNode } = require("../timer");
const {
  timeoutNumber,
  timeoutObject,
  durationObject,
  dueDateObject,
  durationValue,
  wrongObject,
} = require("../examples/timer");
const { ProcessStatus } = require("../../process_state");
const { uniqueId } = require("lodash");

describe("static Schema", () => {
  test("Should merge Node and SystemTaskNode schema", async () => {
    const schema = TimerSystemTaskNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
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

  test("May not have parameters.input if parameters.timeout", () => {
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

  test("Timer node works with timeout and $ref", async () => {
    const spec = _.cloneDeep(timeoutObject);

    const node = new TimerSystemTaskNode(spec);

    const bag = { sample: 10 };
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toBe(bag.sample);
  });

  test("Timer node works with duration", async () => {
    const spec = _.cloneDeep(durationValue);

    const node = new TimerSystemTaskNode(spec);

    const bag = {};
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toEqual(10 * 60 + 10);
  });

  test("Timer node works with duration and $ref", async () => {
    const spec = _.cloneDeep(durationObject);

    const node = new TimerSystemTaskNode(spec);

    const bag = { duration: "PT10M10S" };
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toEqual(10 * 60 + 10);
  });

  test("Timer node works with dueDate and $ref", async () => {
    const spec = _.cloneDeep(dueDateObject);

    const node = new TimerSystemTaskNode(spec);

    const curDate = new Date();
    const bag = { date: new Date(curDate.getTime() + 10 * 60 * 1000) };
    const input = { input: "value" };
    const nodeResult = await node.run({ bag, input });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.timeout).toBeCloseTo(600);
  });

  test("Timer node passes process_id to _run", async () => {
    const spec = _.cloneDeep(durationObject);

    const node = new TimerSystemTaskNode(spec);

    const bag = { duration: "PT10M10S" };
    const input = { input: "value", step_number: 2 };
    const process_id = uniqueId();
    const parameters = { process_id };
    const nodeResult = await node.run({ bag, input, parameters });

    expect(nodeResult.status).toBe(ProcessStatus.PENDING);
    expect(nodeResult.result.process_id).toBeDefined();
    expect(nodeResult.result.step_number).toBeDefined();
  });

  test("Timer node needs one of the time keys", async () => {
    const spec = _.cloneDeep(wrongObject);

    const node = new TimerSystemTaskNode(spec);

    const bag = { duration: "TESTE" };
    const input = { input: "value", step_number: 2 };
    const process_id = uniqueId();
    const parameters = { process_id };
    const nodeResult = await node.run({ bag, input, parameters });

    expect(nodeResult.status).toBe(ProcessStatus.ERROR);
    expect(nodeResult.result.process_id).toBeDefined();
    expect(nodeResult.result.step_number).toBeDefined();
  });
});
