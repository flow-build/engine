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
      category: "HTTP",
      name: "Call endpoint",
      next: "3",
      lane_id: "true",
      parameters: {
        input: {
          test: {
            $mustache: "value bag {{ bag.value }}",
          },
        },
        request: {
          verb: "POST",
          url: "{{host}}",
          headers: {
            ContentType: "application/json",
            env: "{{node_env}}",
          },
        },
      },
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {
    node_env: "NODE_ENV",
    host: "API_HOST",
  },
};
