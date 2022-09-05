const minimal = {
  id: "HTTP",
  type: "SystemTask",
  category: "Http",
  name: "HTTP Node",
  next: "END",
  lane_id: "1",
  parameters: {
    input: {
      payload: { $ref: "bag.payload" },
    },
    request: {
      url: "https://koa-app:3000/test_api",
      verb: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  },
};

const getResult = {
  bag: { payload: { dummy: "payload" } },
  error: null,
  external_input: {},
  next_node_id: "END",
  node_id: "HTTP",
  result: { status: 200, data: { response: "get_success" } },
  status: "running",
};

const postResult = {
  bag: { payload: { dummy: "payload" } },
  error: null,
  external_input: {},
  next_node_id: "END",
  node_id: "HTTP",
  result: { status: 201, data: { response: "post_success" } },
  status: "running",
};

const deleteResult = {
  bag: { payload: { dummy: "payload" } },
  error: null,
  external_input: {},
  next_node_id: "END",
  node_id: "HTTP",
  result: { status: 204, data: { response: "delete_success" } },
  status: "running",
};

module.exports = {
  minimal,
  getResult,
  postResult,
  deleteResult,
};
