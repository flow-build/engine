const invalidNamespace = {
  id: "2",
  type: "SystemTask",
  name: "System  Task Node",
  next: "3",
  lane_id: "1",
  parameters: {
    input: {
      key: { $ref: "invalid.node_data" },
    },
  },
};

module.exports = {
  invalidNamespace,
};
