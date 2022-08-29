const _ = require("lodash");

const baseSpec = {
  id: "USER-TASK",
  type: "UserTask",
  name: "User task",
  next: "END",
  lane_id: "true",
  parameters: {
    action: "do something",
    input: {
      question: "Insert some input.",
    },
  },
};

const buildUserTaskNode = (spec) => {
  return _.merge({}, baseSpec, spec);
};

module.exports = buildUserTaskNode;
