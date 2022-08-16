const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "true",
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag actor data user run",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {
          runUser: { $ref: "actor_data" },
        },
      },
    },
    {
      id: "3",
      type: "UserTask",
      name: "User task",
      next: "4",
      lane_id: "true",
      parameters: {
        action: "user_action",
        input: {},
      },
    },
    {
      id: "4",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag actor data continue userTask",
      next: "99",
      lane_id: "true",
      parameters: {
        input: {
          continueUser: { $ref: "actor_data" },
        },
      },
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
