/* eslint-disable no-unused-vars */
const defaultMock = {
  get: (endpoint, headers) => {
    expect(endpoint).toBe("https://koa-app:3000/test_api");
    return { status: 200, data: { response: "get_success" } };
  },
  post: (endpoint, payload, headers) => {
    if (endpoint == "https://postman-echo.com/post") {
      return {
        status: 200,
        data: {
          args: {},
          data: "",
          files: {},
          form: {
            foo1: "bar1",
            foo2: "bar2",
          },
          headers: {
            "x-forwarded-proto": "https",
            "x-forwarded-port": "443",
            host: "postman-echo.com",
            "x-amzn-trace-id": "Root=1-6209714b-4f8488f8238f70316ac0b337",
            "content-length": "19",
            "user-agent": "PostmanRuntime/7.29.0",
            accept: "*/*",
            "cache-control": "no-cache",
            "postman-token": "85f6c818-130a-4840-b13a-e6d3fc0b1b52",
            "accept-encoding": "gzip, deflate, br",
            "content-type": "application/x-www-form-urlencoded",
          },
          json: {
            foo1: "bar1",
            foo2: "bar2",
          },
          url: "https://postman-echo.com/post",
        },
      };
    }

    if (endpoint == "https://127.0.0.2") {
      throw {
        code: "ECONNREFUSED",
        address: "127.0.0.2",
        port: 443,
      };
    }

    if (endpoint === "https://postman-echo.com/status/403") {
      return {
        status: 403,
        data: {
          message: "a message",
        },
      };
    }

    if (endpoint === "https://postman-echo.com/status/401") {
      throw new Error("Request failed with status code 401");
    }

    if (endpoint === "https://postman-echo.com/status/503") {
      throw {
        response: {
          status: 503,
          data: '',
        }
      };
    }

    expect(endpoint).toBe("https://koa-app:3000/test_api");
    expect(payload).toStrictEqual({ payload: { dummy: "payload" } });
    return { status: 201, data: { response: "post_success" } };
  },
  put: () => {
    console.log("put");
    return { status: 200, data: { response: "success" } };
  },
  patch: () => {
    return { status: 200, data: { response: "success" } };
  },
  delete: (endpoint, headers) => {
    expect(endpoint).toBe("https://koa-app:3000/test_api");
    return { status: 204, data: { response: "delete_success" } };
  },
};

const currentMock = { ...defaultMock };

module.exports = {
  create: () => {
    return currentMock;
  },
  __customResponse(verb, method) {
    currentMock[verb] = method;
  },
  __clearCustomResponse(verb) {
    currentMock[verb] = defaultMock[verb];
  },
};
