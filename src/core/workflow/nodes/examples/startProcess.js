const minimal = {
  id: "START-PROCESS",
  type: "SystemTask",
  category: "StartProcess",
  name: "startProcess system task node",
  next: "END",
  lane_id: "1",
  parameters: {
    workflow_name: "example_workflow",
    actor_data: {},
    input: {},
  },
};

module.exports = {
  minimal,
};
