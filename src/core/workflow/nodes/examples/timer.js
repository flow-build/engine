const timeoutNumber = {
  id: "TIMEOUT-NUMBER",
  type: "SystemTask",
  category: "Timer",
  name: "sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    timeout: 20,
  },
};

const timeoutObject = {
  id: "TIMEOUT-OBJECT",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    input: {
      value: { $ref: "bag.sample" },
    },
    timeout: { $ref: "value" },
  },
};

const successResult = {
  bag: { identity_system_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "4",
  node_id: "3",
  result: { identity_system_data: "bag" },
  status: "running",
};

module.exports = { timeoutNumber, timeoutObject, successResult };
