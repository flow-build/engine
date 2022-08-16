const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {
    path: "PATH",
  },
  prepare: [],
  nodes: [
    {
      id: "env_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "env_2",
      lane_id: "true",
    },
    {
      id: "env_2",
      type: "SystemTask",
      category: "HTTP",
      name: "Call endpoint",
      next: "end",
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
