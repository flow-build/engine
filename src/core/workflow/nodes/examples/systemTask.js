const minimal = {
  id: "3",
  type: "IdentityServiceTask",
  name: "Identity System Task Node",
  next: "4",
  lane_id: "1",
  parameters: {
    input: {
      identity_system_data: { $ref: "bag.identity_system_data" },
    },
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

module.exports = { minimal, successResult };
