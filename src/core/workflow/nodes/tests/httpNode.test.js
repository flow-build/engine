const _ = require("lodash");
const { minimal, getResult, postResult, deleteResult } = require("../examples/http");
const { HttpSystemTaskNode } = require("../http");
const axios = require("axios");
const { ProcessStatus } = require("../../process_state");

describe("static code inspection", () => {
  test("Should correctly identify codes", async () => {
    const target_codes = [400, '5XX', 'ECONNABORTED'];
    
    let response = HttpSystemTaskNode.includesHTTPCode(target_codes, 404);
    expect(response).toBeNull();

    response = HttpSystemTaskNode.includesHTTPCode(target_codes, 503);
    expect(response).toBeTruthy();

    response = HttpSystemTaskNode.includesHTTPCode(target_codes, 'ECONNABORTED');
    expect(response).toBeTruthy();
  });
});

describe("static Schema", () => {
  test("Should merge Node and Parameterized schema", async () => {
    const schema = HttpSystemTaskNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next).toBeDefined();
    expect(schema.properties.next.type).toBe("string");
    expect(schema.properties.parameters).toBeDefined();
    expect(schema.properties.parameters.properties.request).toBeDefined();
  });
});

describe("validation", () => {
  test("next should be string", () => {
    const spec = _.cloneDeep(minimal);
    spec.next = {};
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/next");
    expect(error).toMatch("must be string");
  });

  test("must have parameters", () => {
    const node_spec = _.cloneDeep(minimal);
    delete node_spec.parameters;
    const [is_valid, error] = HttpSystemTaskNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'parameters'");
  });

  test("parameters should be an object", () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters = 22;
    const [is_valid, error] = HttpSystemTaskNode.validate(node_spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/parameters");
    expect(error).toMatch("must be object");
  });

  test("parameters must have request", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters.request;
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'request'");
  });

  test("request must have url", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters.request.url;
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'url'");
  });

  test("request must have verb", () => {
    const spec = _.cloneDeep(minimal);
    delete spec.parameters.request.verb;
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must have required property 'verb'");
  });

  test("request header should be an object", () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.request.header = 123;
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must be object");
  });

  test("valid response codes should be an array", () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.valid_response_codes = 123;
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("must be array");
  });

  test("verb should be recognized", () => {
    const spec = _.cloneDeep(minimal);
    spec.parameters.request.verb = "ANY";
    const [is_valid, error] = HttpSystemTaskNode.validate(spec);
    expect(is_valid).toBeFalsy();
    expect(error).toMatch("properties/verb");
    expect(error).toMatch("must be equal to one of the allowed values");
  });
});

describe("execution", () => {
  test("works with GET", async () => {
    const node_spec = minimal;
    node_spec.parameters.request.verb = "GET";
    const node = new HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(getResult);
  });

  test("HttpSystemTaskNode works with POST", async () => {
    const node_spec = minimal;
    node_spec.parameters.request.verb = "POST";
    const node = new HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(postResult);
  });

  test("HttpSystemTaskNode works with DELETE", async () => {
    const node_spec = minimal;
    node_spec.parameters.request.verb = "DELETE";
    const node = new HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(deleteResult);
  });

  test("HttpSystemTaskNode works with $mustache", async () => {
    const spec = minimal;
    spec.parameters.request.verb = { $mustache: "DELETE" };
    const node = new HttpSystemTaskNode(spec);
    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    expect(await node.run({ bag, input, external_input })).toMatchObject(deleteResult);
  });

  test("HttpSystemTaskNode works with $ref bag", async () => {
    const spec = minimal;
    spec.parameters.request.verb = { $ref: "bag.verb" };
    const node = new HttpSystemTaskNode(spec);
    const bag = { payload: { dummy: "payload" }, verb: "DELETE" };
    const input = {};
    const external_input = {};

    const result = await node.run({ bag, input, external_input });

    const expected_result = _.cloneDeep(deleteResult);
    expected_result.bag = bag;
    expect(result).toMatchObject(expected_result);
  });

  test("HttpSystemTaskNode works with $ref actor_data", async () => {
    const spec = minimal;
    spec.parameters.request.verb = { $ref: "actor_data.verb" };
    const node = new HttpSystemTaskNode(spec);
    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    const actor_data = { verb: "DELETE" };
    expect(await node.run({ bag, input, external_input, actor_data })).toMatchObject(deleteResult);
  });

  test("Can reference actor_data", async () => {
    try {
      let calledEndpoint;
      let calledPayload;
      axios.__customResponse("post", (endpoint, payload) => {
        calledEndpoint = endpoint;
        calledPayload = payload;
        return { status: 200, data: { response: "ok" } };
      });

      const node_spec = _.cloneDeep(minimal);
      node_spec.parameters.request.verb = "POST";
      node_spec.parameters.input.payload = { $ref: "actor_data.claims" };
      const node = new HttpSystemTaskNode(node_spec);

      const bag = { bagData: "exampleBagData" };
      const input = {};
      const actor_data = { claims: ["user"] };
      const response = await node.run({ bag, input, actor_data });
      expect(response.result).toBeDefined();
      expect(response.result.status).toEqual(200);
      expect(response.result.data).toEqual({ response: "ok" });
      expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
      expect(calledPayload).toEqual({ payload: actor_data.claims });
    } finally {
      axios.__clearCustomResponse("post");
    }
  });

  test("Can reference environment on request and input", async () => {
    try {
      let calledEndpoint;
      let calledPayload;
      axios.__customResponse("post", (endpoint, payload) => {
        calledEndpoint = endpoint;
        calledPayload = payload;
        return { status: 200, data: { response: "ok" } };
      });

      const node_spec = _.cloneDeep(minimal);
      node_spec.parameters.request.verb = "POST";
      node_spec.parameters.input.payload = { $mustache: "{{environment.threshold}}" };
      node_spec.parameters.request.url = { $ref: "environment.api_url" };
      const node = new HttpSystemTaskNode(node_spec);

      const bag = { payload: "data" };
      const environment = { api_url: "127.0.1.1", threshold: 999 };
      const response = await node.run({ bag, environment });

      expect(response.result).toBeDefined();
      expect(response.result.status).toEqual(200);
      expect(response.result.data).toEqual({ response: "ok" });
      expect(calledEndpoint).toEqual("127.0.1.1");
      expect(calledPayload).toEqual({ payload: "999" });
    } finally {
      axios.__clearCustomResponse("post");
    }
  });

  test("Invalid response code", async () => {
    const node_spec = _.cloneDeep(minimal);
    node_spec.parameters.valid_response_codes = [202];
    node_spec.parameters.request.verb = "GET";

    const node = new HttpSystemTaskNode(node_spec);

    const bag = { payload: { dummy: "payload" } };
    const input = {};
    const external_input = {};
    const node_result = await node.run({ bag, input, external_input });

    expect(node_result.status).toEqual(ProcessStatus.ERROR);
    expect(node_result.result).toBeNull();
  });

  describe("httpTimeout", () => {
    const axios_methods = ["post", "get", "delete", "patch", "put", "head"];

    for (const axios_method of axios_methods) {
      test(`${axios_method.toUpperCase()} Timeout uses ENV HTTP_TIMEOUT`, async () => {
        try {
          process.env.HTTP_TIMEOUT = "10000";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(10000);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.HTTP_TIMEOUT;
        }
      });

      test(`${axios_method.toUpperCase()} If ENV HTTP_TIMEOUT invalid uses 0`, async () => {
        try {
          process.env.HTTP_TIMEOUT = "abc";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.HTTP_TIMEOUT;
        }
      });

      test(`${axios_method.toUpperCase()} If no config uses 0`, async () => {
        try {
          expect(process.env.HTTP_TIMEOUT).toBeUndefined();
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout configured on blueprint`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.timeout = "22";
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(22);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout default if blueprint config is invalid`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.timeout = "abc";
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.timeout).toEqual(0);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });
    }
  });

  describe("maxContentLength", () => {
    const axios_methods = ["post", "get", "delete", "patch", "put", "head"];

    for (const axios_method of axios_methods) {
      test(`${axios_method.toUpperCase()} maxContentLength uses ENV MAX_CONTENT_LENGTH`, async () => {
        try {
          process.env.MAX_CONTENT_LENGTH = "10";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "12345678901" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "12345678901" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(10);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.MAX_CONTENT_LENGTH;
        }
      });

      test(`${axios_method.toUpperCase()} If ENV HTTP_TIMEOUT invalid uses default`, async () => {
        try {
          process.env.MAX_CONTENT_LENGTH = "abc";
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(2000);
        } finally {
          axios.__clearCustomResponse(axios_method);
          delete process.env.MAX_CONTENT_LENGTH;
        }
      });

      test(`${axios_method.toUpperCase()} Uses max_content_length configured on blueprint`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.max_content_length = "22";
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(22);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });

      test(`${axios_method.toUpperCase()} Uses timeout default if blueprint config is invalid`, async () => {
        try {
          let calledEndpoint;
          let axiosConfig;
          axios.__customResponse(axios_method, (endpoint, payload, config) => {
            calledEndpoint = endpoint;
            axiosConfig = config || payload;
            return { status: 200, data: { response: "ok" } };
          });

          const node_spec = _.cloneDeep(minimal);
          node_spec.parameters.request.verb = axios_method.toUpperCase();
          node_spec.parameters.request.max_coontent_length = "abc";
          const node = new HttpSystemTaskNode(node_spec);

          const bag = { bagData: "exampleBagData" };
          const input = {};
          const actor_data = { claims: ["user"] };
          const response = await node.run({ bag, input, actor_data });
          expect(response.result).toBeDefined();
          expect(response.result.status).toEqual(200);
          expect(response.result.data).toEqual({ response: "ok" });
          expect(calledEndpoint).toEqual("https://koa-app:3000/test_api");
          expect(axiosConfig.maxContentLength).toEqual(2000);
        } finally {
          axios.__clearCustomResponse(axios_method);
        }
      });
    }
  });
});
