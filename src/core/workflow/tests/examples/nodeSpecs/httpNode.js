const _ = require("lodash");

const baseSpec = {
  id: "HTTP",
  type: "SystemTask",
  category: "HTTP",
  name: "call endpoint",
  next: "END",
  lane_id: "true",
  parameters: {
    input: {},
    request: {
      verb: "POST",
      url: "{{environment.path}}",
      headers: {
        ContentType: "application/json",
      },
    },
  },
};

const buildHttpNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildHttpNode;
