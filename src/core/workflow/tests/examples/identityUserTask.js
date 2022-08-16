const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "iut_1",
      type: "Start",
      name: "Start iut",
      parameters: {
        input_schema: {},
      },
      next: "iut_2",
      lane_id: "true",
    },
    {
      id: "iut_2",
      type: "UserTask",
      name: "User task",
      next: "end",
      lane_id: "true",
      parameters: {
        action: "do something",
        input: {
          question: "Insert some input.",
        },
      },
    },
    {
      id: "end",
      type: "Finish",
      name: "Finish Node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
