const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "user_action_with_system_task_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "user_action_with_system_task_2",
      lane_id: "true",
    },
    {
      id: "user_action_with_system_task_2",
      type: "UserTask",
      name: "User task node",
      next: "user_action_with_system_task_3",
      lane_id: "true",
      parameters: {
        action: "userAction",
        input: {},
      },
    },
    {
      id: "user_action_with_system_task_3",
      type: "ScriptTask",
      name: "Print user input",
      next: "user_action_with_system_task_4",
      lane_id: "true",
      parameters: {
        input: {
          userInput: { $ref: "result.userInput" },
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            ["println", ["`", "User input: "], ["get", "input", ["`", "userInput"]]],
          ],
        },
      },
    },
    {
      id: "user_action_with_system_task_4",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
