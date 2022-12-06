const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
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
      type: "SystemTask",
      category: "http",
      name: "Http node",
      parameters: {
        input: {
          payload: {
            dummy: { $ref: "environment.payload" },
          },
        },
        request: {
          verb: "POST",
          url: { $ref: "environment.host" },
        },
        retry: {
          amount: 3,
          conditions: ["5XX"],
          interval: 1
        },
        valid_response_codes: [
            "2XX",
            "5XX",
        ]
      },
      next: "99",
      lane_id: "true",
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
  environment: {
    environment: "ENVIRONMENT",
    host: "API_HOST",
    payload: "PAYLOAD",
    threshold: "LIMIT",
  },
};
