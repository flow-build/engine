const _ = require("lodash");
const { v1: uuid } = require("uuid");
const { ProcessStatus } = require("../../process_state");
const { minimal, minimalResult, timeout, timeoutResult } = require("../examples/start");
const { StartNode } = require("../start");
const settings = require("../../../../../settings/tests/settings");
const { PersistorProvider } = require("../../../persist/provider");
const { Timer } = require("../../timer");

async function _clean() {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const timer_persist = persistor.getPersistInstance("Timer");
  await timer_persist.deleteAll();
}

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = Timer.getPersist();
    await persist._db.destroy();
  }
});

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = StartNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("string");
    expect(schema.properties.parameters).toBeDefined();
    expect(schema.properties.parameters.properties.input_schema).toBeDefined();
    expect(schema.properties.parameters.required[0]).toBe("input_schema");
  });
});

describe("validation", () => {
  test("next should be string", () => {
    const spec = _.cloneDeep(minimal);
    spec.next = {};
    const [is_valid, error] = StartNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/next");
    expect(error).toMatch("must be string");
  });

  test("must have parameters", () => {
    const node_spec = _.cloneDeep(minimal);
    delete node_spec.parameters;
    const [is_valid, error] = StartNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'parameters'");
  });

  test("parameters should be an object", () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters = 22;
    const [is_valid, error] = StartNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/parameters");
    expect(error).toMatch("must be object");
  });

  test("parameters must have input_schema", () => {
    const node_spec = _.cloneDeep(minimal);
    delete node_spec.parameters.input_schema;
    const [is_valid, error] = StartNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'input_schema'");
  });

  test("input_schema must be an object", () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.input_schema = "";
    const [is_valid, error] = StartNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/input_schema");
    expect(error).toMatch("must be object");
  });

  test("Node validate input_schema is a valid ajv schema", () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.input_schema = {
      type: "unknowType",
    };
    const node = new StartNode(spec);

    const [is_valid, error] = node.validate();
    expect(is_valid).toBeFalsy();
    expect(error).toBeTruthy();
  });
});

describe("execution", () => {
  test("it works", async () => {
    const node = new StartNode(minimal);

    const bag = { data: "bag" };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const nodeResult = await node.run({ bag, input, external_input });
    expect(nodeResult).toMatchObject(minimalResult);
  });

  test("Run status error if input don't match input_schema", async () => {
    const spec = _.cloneDeep(minimal);
    const node = new StartNode(spec);

    const bag = { data: 10 };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const node_result = await node.run({ bag, input, external_input });
    expect(node_result.status).toEqual(ProcessStatus.ERROR);
    expect(node_result.error).toMatch("Error: data/data must be string");
  });

  test("Run status running with result error if on_error 'resumeNext", async () => {
    const spec = _.cloneDeep(minimal);
    spec.on_error = "resumeNext";
    const node = new StartNode(spec);

    const bag = { data: 10 };
    const input = { data: "result" };
    const external_input = { data: "external" };
    const node_result = await node.run({ bag, input, external_input });
    expect(node_result.status).toEqual(ProcessStatus.RUNNING);
    expect(node_result.bag).toEqual(bag);
    expect(node_result.external_input).toEqual(external_input);
    expect(node_result.error).toBeNull();
    expect(node_result.result.is_error).toEqual(true);
    expect(node_result.result.error).toMatch("Error: data/data must be string");
  });

  test("With timeout pops the timeout parameter up", async () => {
    const spec = _.cloneDeep(timeout);
    const node = new StartNode(spec);
    const bag = { data: "bag" };
    const input = { data: "input" };
    const external_input = { data: "external" };
    const parameters = { process_id: uuid() };
    const nodeResult = await node.run({ bag, input, external_input, parameters });
    expect(nodeResult).toMatchObject(timeoutResult);
  });

  test("With timeout creates a timer", async () => {
    const spec = _.cloneDeep(timeout);
    const node = new StartNode(spec);
    const bag = { data: "bag" };
    const input = { data: "input" };
    const external_input = { data: "external" };
    const process_id = uuid();
    await node.run({ bag, input, external_input, parameters: { process_id } });
    const timer = new Timer("Process", process_id);
    await timer.retrieve();
    expect(timer._id).toBeDefined();
  });
});
