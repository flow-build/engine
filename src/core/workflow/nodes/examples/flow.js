const minimal = {
  id: "FLOW",
  name: "minimal start",
  next: { 1: "3", 2: "4", default: "5" },
  type: "flow",
  lane_id: "anyone",
  on_error: "stop",
  parameters: {
    input: {
      decision_key: { $ref: "result.next_node" },
    },
  },
};

const fromParameters = {
  id: "FLOW",
  type: "Flow",
  name: "Flow Node",
  next: { data: "3", default: "5" },
  lane_id: "1",
  parameters: {
    input: {
      decision_key: { $ref: "parameters.next_node" },
    },
  },
};

const minimalResult = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "3",
  node_id: "FLOW",
  result: { result: "1" },
  status: "running",
};

module.exports = {
  minimal,
  fromParameters,
  minimalResult,
};
