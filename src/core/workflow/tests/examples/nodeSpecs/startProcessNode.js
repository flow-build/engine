const _ = require("lodash");

const baseSpec = {
  id: "START-PROCESS",
  type: "SystemTask",
  category: "startProcess",
  name: "start process node",
  parameters: {
    workflow_name: "minimal",
    input: {},
    actor_data: { $ref: "actor_data" },
  },
  next: "END",
  lane_id: "true",
};

const buildStartProcessNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildStartProcessNode;
