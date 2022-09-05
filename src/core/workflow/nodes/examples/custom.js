customNode = {
  id: "7",
  type: "SystemTask",
  category: "testFunction",
  name: "Custom System task node",
  next: "8",
  lane_id: "1",
  parameters: {
    input: {
      firstTestArg: { $ref: "bag.firstTestArg" },
      secondTestArg: { $ref: "bag.secondTestArg" },
    },
  },
};

module.exports = {
  customNode,
};
