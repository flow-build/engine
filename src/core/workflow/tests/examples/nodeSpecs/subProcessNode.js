const _ = require("lodash");

const baseSpec = {
  id: "SUBPROCESS",
  type: "SubProcess",
  name: "subprocess base in user task node",
  next: "END",
  lane_id: "true",
  parameters: {
    actor_data: {
      id: "2",
      claims: [],
    },
    input: {},
    workflow_name: "blueprint_spec_son",
    valid_response: "finished",
  },
};

const buildSubprocessNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildSubprocessNode;
