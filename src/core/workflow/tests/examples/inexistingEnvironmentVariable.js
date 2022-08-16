const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {
    inexistent: "INEXISTENT",
  },
  prepare: [],
  nodes: [
    {
      id: "inex_1",
      type: "Start",
      name: "Start inexistant",
      parameters: {
        input_schema: {},
      },
      next: "inex_2",
      lane_id: "true",
    },
    {
      id: "inex_2",
      type: "SystemTask",
      category: "HTTP",
      name: "Call endpoint",
      next: "end",
      lane_id: "true",
      parameters: {
        input: {},
        request: {
          verb: "POST",
          url: "{{environment.inexistent}}",
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
