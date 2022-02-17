const minimal = {
  id: "FORM",
  name: "minimal form request",
  next: "NEXT",
  type: "SystemTask",
  lane_id: "anyone",
  category: "formrequest",
  parameters: {
    input: {},
    request: {
      url: "http://example.com",
      verb: "POST",
      headers: {
        ContentType: "application/x-www-form-urlencoded",
      },
    },
  },
};

const postTest = {
  id: "FORM",
  name: "minimal form request",
  next: "NEXT",
  type: "systemtask",
  lane_id: "anyone",
  category: "formrequest",
  parameters: {
    input: {
      foo1: "bar1",
      foo2: "bar2",
    },
    request: {
      url: "https://postman-echo.com/post",
      verb: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  },
};

const testWithValidResponseCode = {
  id: "FORM",
  name: "minimal form request",
  next: "NEXT",
  type: "systemtask",
  lane_id: "anyone",
  category: "formrequest",
  parameters: {
    valid_response_codes: [200, 201, 204],
    input: {
      foo1: "bar1",
      foo2: "bar2",
    },
    request: {
      url: "https://postman-echo.com/status/403",
      verb: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  },
};

const testError = {
  id: "FORM",
  name: "minimal form request",
  next: "NEXT",
  type: "systemtask",
  lane_id: "anyone",
  category: "formrequest",
  parameters: {
    valid_response_codes: [200, 201, 204],
    input: {
      foo1: "bar1",
      foo2: "bar2",
    },
    request: {
      url: "https://postman-echo.com/status/401",
      verb: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  },
};

const noResponseTest = {
  id: "FORM",
  name: "minimal form request",
  next: "NEXT",
  type: "systemtask",
  lane_id: "anyone",
  category: "formrequest",
  parameters: {
    input: {
      foo1: "bar1",
      foo2: "bar2",
    },
    request: {
      url: "https://127.0.0.2",
      verb: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  },
};

const successResult = {
  bag: {
    payload: {
      dummy: "payload",
    },
  },
  error: null,
  external_input: {},
  next_node_id: "NEXT",
  node_id: "FORM",
  result: {},
  status: "running",
};

module.exports = {
  minimal,
  postTest,
  successResult,
  noResponseTest,
  testWithValidResponseCode,
  testError,
};
