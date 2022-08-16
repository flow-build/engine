const _ = require("lodash");

const baseSpec = {
  id: "START",
  type: "Start",
  name: "Start node",
  parameters: {
    input_schema: {},
  },
  next: "END",
  lane_id: "true",
};

const buildStartNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildStartNode;
