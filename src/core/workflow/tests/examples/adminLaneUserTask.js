const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "admin_identity_user_task_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "admin_identity_user_task_2",
      lane_id: "admin",
    },
    {
      id: "admin_identity_user_task_2",
      type: "UserTask",
      name: "User task",
      next: "end",
      lane_id: "admin",
      parameters: {
        action: "do something",
        input: {},
      },
    },
    {
      id: "end",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
