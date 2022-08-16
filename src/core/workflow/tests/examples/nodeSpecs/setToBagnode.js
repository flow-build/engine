const _ = require("lodash");

const baseSpec = {
  id: "SYSTEM-TASK",
  type: "SystemTask",
  category: "SetToBag",
  name: "system task node",
  parameters: {
    input: {
      new_bag: { $ref: "result.result" },
    },
  },
  next: "END",
  lane_id: "true",
};

const buildSetToBagNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildSetToBagNode;
