const minimal = {
  id: "START",
  name: "minimal start",
  next: "CONFIG",
  type: "start",
  lane_id: "anyone",
  on_error: "stop",
  parameters: {
    input_schema: {
      type: "object",
      required: ["data"],
      properties: {
        data: { type: "string" },
      },
    },
  },
};

const timeout = {
  id: "START-TIMEOUT",
  type: "Start",
  name: "start node",
  parameters: {
    input_schema: {},
    timeout: 5,
  },
  next: "END",
  lane_id: "1",
};

const minimalResult = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "CONFIG",
  node_id: "START",
  result: {},
  status: "running",
};

const timeoutResult = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "END",
  node_id: "START-TIMEOUT",
  result: { timeout: 5 },
  status: "running",
};

module.exports = {
  minimal,
  timeout,
  minimalResult,
  timeoutResult,
};
