const _ = require("lodash");
const { nodefyClass,
        nodefyFunction } = require("../../nodefy");
const { SystemTaskNode } = require("../../../workflow/nodes");
const { nodes_ } = require("../../../workflow/tests/unitary/node_samples");

function testFunction(firstTestArg, secondTestArg) {
  return [firstTestArg, secondTestArg];
}

class testClass {
  firstTestMethod(firstTestArg, secondTestArg) {
    return [firstTestArg, secondTestArg];
  }

  secondTestMethod(firstTestArg, secondTestArg) {
    return [secondTestArg, firstTestArg];
  }
}

describe("Nodefy Function should work", () => {

  test("nodefyFunction returns valid SystemTaskNode", () => {
    const custom_node_class = nodefyFunction(testFunction);
    const custom_node = new custom_node_class();
    expect(custom_node).toBeInstanceOf(SystemTaskNode);
  });

  test("CustomSystemTaskNode _run works correctly", async () => {
    const custom_node_class = nodefyFunction(testFunction);
    const custom_node = new custom_node_class();
    const execution_data = {firstTestArg: "first", secondTestArg: "second"};
    const result = await custom_node._run(execution_data, null);
    expect(result[0]).toStrictEqual(["first", "second"]);
    expect(result[1]).toBe("running");
  });

  test("CustomSystemTaskNode runs its validations correctly", () => {
    const node_spec = _.cloneDeep(nodes_.custom_system_task);
    const custom_node_class = nodefyFunction(testFunction);
    const custom_node = new custom_node_class(node_spec);
    const result = custom_node.validate(node_spec);
    expect(result[0]).toBeTruthy();
  });

  test("CustomSystemTaskNode run works correctly", async () => {
    const node_spec = _.cloneDeep(nodes_.custom_system_task);
    const custom_node_class = nodefyFunction(testFunction);

    const custom_node = new custom_node_class(node_spec);
    const bag = {firstTestArg: "first", secondTestArg: "second"};
    const input = {};
    const external_input = {};

    const result = await custom_node.run({bag, input, external_input});
    expect(result.result).toStrictEqual(["first", "second"]);
    expect(result.error).toBeNull();
    expect(result.status).toBe("running");
  });
});

describe("Nodefy Class should work", () => {

  test("nodefyClass returns valid Node map", () => {
    const custom_node_map = nodefyClass(testClass);
    expect(custom_node_map).toHaveProperty("firstTestMethod");
    expect(custom_node_map).toHaveProperty("secondTestMethod");

    let custom_node_class = custom_node_map["firstTestMethod"];
    let custom_node = new custom_node_class();
    expect(custom_node).toBeInstanceOf(SystemTaskNode);
    custom_node_class = custom_node_map["secondTestMethod"];
    custom_node = new custom_node_class();
    expect(custom_node).toBeInstanceOf(SystemTaskNode);
  });

  test("CustomSystemTaskNode _run works correctly", async () => {
    const custom_node_map = nodefyClass(testClass);
    const custom_node_class = custom_node_map["firstTestMethod"];
    const custom_node = new custom_node_class();
    const execution_data = {firstTestArg: "first", secondTestArg: "second"};
    const result = await custom_node._run(execution_data, null);
    expect(result[0]).toStrictEqual(["first", "second"]);
    expect(result[1]).toBe("running");
  });

  test("CustomSystemTaskNode runs its validations correctly", () => {
    const node_spec = _.cloneDeep(nodes_.custom_system_task);
    const custom_node_map = nodefyClass(testClass);
    const custom_node_class = custom_node_map["firstTestMethod"];
    const custom_node = new custom_node_class(node_spec);
    const result = custom_node.validate(node_spec);
    expect(result[0]).toBeTruthy();
  });

  test("CustomSystemTaskNode run works correctly", async () => {
    const node_spec = _.cloneDeep(nodes_.custom_system_task);
    node_spec.category = "secondTestMethod";

    const custom_node_map = nodefyClass(testClass);
    const custom_node_class = custom_node_map["secondTestMethod"];
    const custom_node = new custom_node_class(node_spec);
    const bag = {firstTestArg: "first", secondTestArg: "second"};
    const input = {};
    const external_input = {};

    const result = await custom_node.run({bag, input, external_input});
    expect(result.result).toStrictEqual(["second", "first"]);
    expect(result.error).toBeNull();
    expect(result.status).toBe("running");
  });
});
