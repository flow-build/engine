const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      next: "2",
      lane_id: "true",
      parameters: {
        input_schema: {},
      },
    },
    {
      id: "2",
      type: "UserTask",
      name: "Identity user task notify",
      next: "3",
      lane_id: "true",
      parameters: {
        action: "do something",
        activity_manager: "notify",
        input: {
          question: "Insert some input.",
        },
      },
    },
    {
      id: "3",
      type: "UserTask",
      name: "Identity user task",
      next: "99",
      lane_id: "true",
      parameters: {
        action: "do something",
        input: {
          question: "Insert some input.",
        },
        activity_schema: {
          type: "object",
          properties: {
            textParamTwo: {
              type: "string",
            },
          },
          required: ["textParamTwo"],
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
