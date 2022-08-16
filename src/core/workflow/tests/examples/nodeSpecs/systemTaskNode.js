const _ = require("lodash");

const baseSpec = {
  id: "SYSTEM-TASK",
  type: "SystemTask",
  category: "custom_fn",
  name: "system task node",
  parameters: {
    input: {},
  },
  next: "END",
  lane_id: "true",
};

const buildSystemTaskNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildSystemTaskNode;
