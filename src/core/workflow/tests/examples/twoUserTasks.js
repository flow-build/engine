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
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "true",
    },
    {
      id: "2",
      type: "UserTask",
      name: "User task",
      next: "3",
      lane_id: "true",
      parameters: {
        action: "first",
        input: {
          question: "Insert some input.",
        },
      },
    },
    {
      id: "3",
      type: "UserTask",
      name: "User task",
      next: "9",
      lane_id: "true",
      parameters: {
        action: "second",
        input: {
          question: "Insert some input.",
        },
      },
    },
    {
      id: "9",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
