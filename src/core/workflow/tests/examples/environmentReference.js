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
      category: "SetToBag",
      name: "Set to bag node",
      parameters: {
        input: {
          environment: { $ref: "environment.environment" },
        },
      },
      next: "3",
      lane_id: "true",
    },
    {
      id: "3",
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
      },
      next: "4",
      lane_id: "true",
    },
    {
      id: "4",
      type: "ScriptTask",
      name: "Script node",
      parameters: {
        input: {
          threshold: { $ref: "environment.threshold" },
        },
        script: {
          function: ["fn", ["input", "&", "args"], "input"],
        },
      },
      next: "5",
      lane_id: "true",
    },
    {
      id: "5",
      type: "UserTask",
      name: "Start node",
      parameters: {
        input: {
          limit: { $mustache: "O limite é {{environment.threshold}}" },
        },
        action: "refenceEnvironment",
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
