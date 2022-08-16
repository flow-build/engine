const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "start  node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "true",
    },
    {
      id: "2",
      type: "UserTask",
      name: "user task node",
      parameters: {
        action: "example_action",
        input: {},
        timeout: 1,
      },
      next: "3",
      lane_id: "true",
    },
    {
      id: "3",
      type: "UserTask",
      name: "user task node",
      parameters: {
        action: "second_action",
        input: {},
      },
      next: "99",
      lane_id: "true",
    },
    {
      id: "99",
      type: "Finish",
      name: "finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
