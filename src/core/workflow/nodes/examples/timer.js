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
    timeout: { $ref: "bag.sample" },
  },
};

const dueDateObject = {
  id: "DUEDATE-OBJECT",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    dueDate: { $ref: "bag.date" },
  },
};

const durationObject = {
  id: "DURATION-OBJECT",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    duration: { $ref: "bag.duration" },
  },
};

const durationValue = {
  id: "DURATION-OBJECT",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    duration: "PT10M10S",
  },
};

const wrongObject = {
  id: "WRONG-OBJECT",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "END",
  lane_id: "1",
  parameters: {},
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

module.exports = {
  timeoutNumber,
  timeoutObject,
  dueDateObject,
  durationObject,
  durationValue,
  successResult,
  wrongObject,
};
