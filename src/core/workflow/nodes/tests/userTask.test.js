const _ = require("lodash");
const { UserTaskNode } = require("../userTask");
const { nodes_, results_ } = require("../../tests/unitary/node_samples");
const crypto_manager = require("../../../crypto_manager");
const examples = require("../examples/userTask");

describe("Validation", () => {
  test("Accept a correct spec", async () => {
    const node = new UserTaskNode(examples.complete);
    const [validation, errors] = node.validate();
    expect(validation).toBeTruthy();
    expect(errors).toBe("null");
  });

  test("Must have id", async () => {
    let spec = _.cloneDeep(examples.minimal);
    delete spec.id;
    const node = new UserTaskNode(spec);
    const [validation, errors] = node.validate();
    expect(validation).toBeFalsy();
    const _errors = JSON.parse(errors);
    expect(_errors[0].message).toBe("must have required property 'id'");
  });

  test("Must have next", async () => {
    let nextSpec = _.cloneDeep(examples.minimal);
    delete nextSpec.next;
    const node = new UserTaskNode(nextSpec);
    const [validation, errors] = node.validate();
    expect(validation).toBeFalsy();
    const _errors = JSON.parse(errors);
    expect(_errors[0].message).toBe("must have required property 'next'");
  });

  test("Must have lane_id", async () => {
    let spec = _.cloneDeep(examples.minimal);
    delete spec.lane_id;
    const node = new UserTaskNode(spec);
    const [validation, errors] = node.validate();
    expect(validation).toBeFalsy();
    const _errors = JSON.parse(errors);
    expect(_errors[0].message).toBe("must have required property 'lane_id'");
  });

  test("Must have type", async () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec.type;
    const node = new UserTaskNode(spec);
    const [validation, errors] = node.validate();
    expect(validation).toBeFalsy();
    const _errors = JSON.parse(errors);
    expect(_errors[0].message).toBe("must have required property 'type'");
  });

  test("Must have parameters", async () => {
    const spec = _.cloneDeep(examples.minimal);
    delete spec.parameters;
    const node = new UserTaskNode(spec);
    const [validation, errors] = node.validate();
    expect(validation).toBeFalsy();
    const _errors = JSON.parse(errors);
    expect(_errors[0].message).toBe("must have required property 'parameters'");
  });

  describe("parameters", () => {
    test("Must have action", async () => {
      const spec = _.cloneDeep(examples.minimal);
      delete spec.parameters.action;
      const node = new UserTaskNode(spec);
      const [validation, errors] = node.validate();
      expect(validation).toBeFalsy();
      const _errors = JSON.parse(errors);
      expect(_errors[0].message).toBe("must have required property 'action'");
    });

    test("Must have input", async () => {
      const spec = _.cloneDeep(examples.minimal);
      delete spec.parameters.input;
      const node = new UserTaskNode(spec);
      const [validation, errors] = node.validate();
      expect(validation).toBeFalsy();
      const _errors = JSON.parse(errors);
      expect(_errors[0].message).toBe("must have required property 'input'");
    });

    describe("timeout", () => {
      test("timeout can be an object", async () => {
        let spec = _.cloneDeep(examples.complete);
        let node = new UserTaskNode(spec);
        const [validation, errors] = node.validate();
        expect(validation).toBeTruthy();
        expect(errors).toBe("null");
      });

      test("timeout can be a number", async () => {
        let spec = _.cloneDeep(examples.complete);
        spec.parameters.timeout = 10;
        let node = new UserTaskNode(spec);
        const [validation, errors] = node.validate();
        expect(validation).toBeTruthy();
        expect(errors).toBe("null");
      });

      test("timeout cannot be a string", async () => {
        let spec = _.cloneDeep(examples.complete);
        spec.parameters.timeout = "10";
        let node = new UserTaskNode(spec);
        const [validation, errors] = node.validate();
        expect(validation).toBeFalsy();
        const _errors = JSON.parse(errors);
        expect(_errors[0].message).toBe("must be number");
      });
    });

    test("activity_schema must be a valid JSON Schema", async () => {
      let actSchemaSpec = _.cloneDeep(examples.minimal);
      actSchemaSpec.parameters.activity_schema = examples.wrongActivitySchema;
      const node = new UserTaskNode(actSchemaSpec);
      const [validation, errors] = node.validate();
      expect(validation).toBeFalsy();
      const _errors = JSON.parse(errors);
      expect(_errors[0].message).toBe("invalid activity_schema");
    });

    test("encrypted_data must be an array", async () => {
      let spec = _.cloneDeep(examples.complete);
      spec.parameters.encrypted_data = "any";
      const node = new UserTaskNode(spec);
      const [validation, errors] = node.validate();
      expect(validation).toBeFalsy();
      const _errors = JSON.parse(errors);
      expect(_errors[0].message).toBe("must be array");
    });

    test("channels cannot be a string", async () => {
      let spec = _.cloneDeep(examples.complete);
      spec.parameters.channels = "any";
      const node = new UserTaskNode(spec);
      const [validation, errors] = node.validate();
      expect(validation).toBeFalsy();
      const _errors = JSON.parse(errors);
      expect(_errors[0].message).toBe("must be array");
    });
  });
});

describe("UserTaskNode", () => {
  test("UserTaskNode works when waiting", async () => {
    const node = new UserTaskNode(nodes_.user_task);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const external_input = null;
    const actor_data = {};
    const result = await node.run({ bag, input, external_input, actor_data });
    expect(result).toEqual(expect.objectContaining(results_.success_waiting_user_task_result));
  });

  test("UserTaskNode works", async () => {
    const node = new UserTaskNode(nodes_.user_task);

    const bag = { identity_user_data: "bag" };
    const input = { identity_user_data: "bag" };
    const external_input = { data: "external" };
    const actor_data = {};
    await node.run({ bag, input, external_input, actor_data });
    const result = await node.run({ bag, input, external_input, actor_data });
    expect(result).toMatchObject(results_.success_user_task_result);
  });

  describe("UserTaskNode encrypted_data works", () => {
    function getNode(encrypted_data) {
      const node_spec = _.cloneDeep(nodes_.user_task);
      node_spec.parameters.encrypted_data = encrypted_data;

      return new UserTaskNode(node_spec);
    }

    test("encrypt value", async () => {
      const user_task_node = getNode(["password"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { password: "senha" };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ password: "encryptedData" });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("encrypt nested value", async () => {
      const user_task_node = getNode(["user.password"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { password: "senha" } };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ user: { password: "encryptedData" } });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("encrypt multiple values", async () => {
      const user_task_node = getNode(["user.password", "value"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { password: "senha" }, value: 22 };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toEqual({ user: { password: "encryptedData" }, value: "encryptedData" });

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });

    test("no error with encrypted_data missing", async () => {
      const user_task_node = getNode(["user.password", "value"]);

      const original_getCrypto = crypto_manager.getCrypto;
      try {
        const mock_getCrypt = jest.fn().mockImplementation(() => {
          return {
            encrypt: () => "encryptedData",
          };
        });
        crypto_manager.getCrypto = mock_getCrypt;

        const bag = { bagData: "example bag data" };
        const input = { inputData: "example input data" };
        const external_input = { user: { name: "username" } };
        const actor_data = {};
        const result = await user_task_node.run({ bag, input, external_input, actor_data });
        expect(result).toBeDefined();
        expect(result.result).toStrictEqual(external_input);
        expect(result.result.value).toBeUndefined();
        expect(result.result.user.passwrod).toBeUndefined();

        expect(mock_getCrypt).toHaveBeenNthCalledWith(1);
      } finally {
        crypto_manager.getCrypto = original_getCrypto;
      }
    });
  });

  test("Creates activity manager with parameter timeout", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.timeout = 10;

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { identity_user_data: "bag" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({ timeout: 10 });
  });

  test("Creates activity manager with parameter channel", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.channels = ["1"];

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "example_bag_data" };
    const input = { identity_user_data: "example_input_data" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({ channels: ["1"] });
  });

  test("Creates activity manager with parameter crypto", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.encrypted_data = ["password"];

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "example_bag_data" };
    const input = { identity_user_data: "example_input_data" };
    const actor_data = {};
    const result = await node.run({ bag, input, actor_data });
    expect(result.activity_manager).toBeDefined();
    expect(result.activity_manager.parameters).toEqual({
      encrypted_data: ["password"],
    });
  });

  test("Can reference actor_data on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $ref: "actor_data.id" };

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const external_input = null;
    const actor_data = { id: 22 };
    const result = await node.run({ bag, input, external_input, actor_data });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = 22;

    expect(result).toMatchObject(expected_result);
  });

  test("Can reference environment on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $mustache: "user of {{environment.node_env}}" };

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const actor_data = { id: 22 };
    const environment = {
      node_env: "test",
    };

    const result = await node.run({ bag, input, actor_data, environment });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = "user of test";

    expect(result).toMatchObject(expected_result);
  });

  test("Can reference parameters on input", async () => {
    const node_spec = _.cloneDeep(nodes_.user_task);
    node_spec.parameters.input.identity_user_data = { $mustache: "user of {{parameters.data}}" };

    const node = new UserTaskNode(node_spec);

    const bag = { identity_user_data: "bag" };
    const input = { data: "result" };
    const actor_data = { id: 22 };
    const environment = {};
    const parameters = { data: "params" };

    const result = await node.run({ bag, input, actor_data, environment, parameters });

    const expected_result = _.cloneDeep(results_.success_waiting_user_task_result);
    expected_result.result.identity_user_data = "user of params";

    expect(result).toMatchObject(expected_result);
  });
});
