const minimal = {
    id: "END",
    name: "minimal trigger finish node",
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
      signal: 'test_signal'
    },
  };
  
  const successResult = {
    bag: { data: "bag" },
    error: null,
    external_input: { data: "external" },
    next_node_id: null,
    node_id: "END",
    result: {
        trigger_payload: {
            bagRef: "bag",
            paramsRef: "params",
            resultRef: "result",
        },
        signal: 'test_signal'
    },
    status: "finished",
  };
  
  module.exports = {
    minimal,
    successResult,
  };
  