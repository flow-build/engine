const minimal = {
  id: "END",
  name: "minimal finish node",
  next: null,
  type: "finish",
  lane_id: "anyone",
  on_error: "stop",
  parameters: {
    input: {
      bagRef: { $ref: "bag.data" },
      paramsRef: { $ref: "parameters.data" },
      resultRef: { $ref: "result.data" },
    },
  },
};

const successResult = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: null,
  node_id: "END",
  result: {
    bagRef: "bag",
    paramsRef: "params",
    resultRef: "result",
  },
  status: "finished",
};

module.exports = {
  minimal,
  successResult,
};
