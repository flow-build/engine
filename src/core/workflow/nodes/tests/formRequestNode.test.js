const { FormRequestNode } = require("../formRequest");
const samples = require("../examples/formRequest");

describe("FormRequestNode", () => {
  describe("static validation", () => {
    test("should validate", () => {
      const spec = samples.minimal;
      const [is_valid, error] = FormRequestNode.validate(spec);
      expect(is_valid).toEqual(true);
      const errorObj = JSON.parse(error);
      expect(errorObj).toBeNull();
    });

    test("should return an error if request method is GET", () => {
      let spec = samples.minimal;
      spec.parameters.request.verb = "GET";
      const [is_valid, error] = FormRequestNode.validate(spec);
      const errorObj = JSON.parse(error);
      expect(is_valid).toEqual(false);
      expect(errorObj[0].message).toEqual("must be equal to one of the allowed values");
    });

    test("should return an error if no parameters where provided", () => {
      let spec = samples.minimal;
      delete spec.parameters;
      const [is_valid, error] = FormRequestNode.validate(spec);
      const errorObj = JSON.parse(error);
      expect(is_valid).toEqual(false);
      expect(errorObj[0].message).toEqual("must have required property 'parameters'");
    });
  });

  test("node validate", async () => {
    const spec = samples.postTest;
    const node = new FormRequestNode(spec);

    const [is_valid, error] = node.validate();
    expect(is_valid).toEqual(true);
    const errorObj = JSON.parse(error);
    expect(errorObj).toBeNull();
  });

  describe("node run", () => {
    test("works", async () => {
      const spec = samples.postTest;
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual(200);
      expect(result.status).toEqual("running");
      expect(result.bag).toEqual(bag);
    });

    test("works with valid response codes", async () => {
      let spec = samples.postTest;
      spec.parameters.valid_response_codes = [200, 201, 202, 204];
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual(200);
      expect(result.status).toEqual("running");
      expect(result.bag).toEqual(bag);
    });

    test("works with put", async () => {
      let spec = samples.postTest;
      spec.parameters.request.verb = "PUT";
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual(200);
      expect(result.status).toEqual("running");
      expect(result.bag).toEqual(bag);
    });

    test("works with patch", async () => {
      let spec = samples.postTest;
      spec.parameters.request.verb = "PATCH";
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual(200);
      expect(result.status).toEqual("running");
      expect(result.bag).toEqual(bag);
    });

    test("should return a error status with valid response code is invalid", async () => {
      const spec = samples.testWithValidResponseCode;
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual(403);
      expect(result.status).toEqual("error");
      expect(result.result.error).toEqual("invalid response code");
      expect(result.result.data.message).toEqual("a message");
    });

    test("should deal with ECONNREFUSED error", async () => {
      const spec = samples.noResponseTest;
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.result.status).toEqual("ECONNREFUSED");
      expect(result.status).toEqual("running");
      expect(result.bag).toEqual(bag);
    });

    test("unexpected error", async () => {
      const spec = samples.testError;
      const node = new FormRequestNode(spec);

      const bag = { payload: { dummy: "payload" } };
      const input = {};
      const external_input = {};
      const result = await node.run({ bag, input, external_input });

      expect(result.status).toEqual("error");
      expect(result.error).toBeDefined();
    });
  });
});
