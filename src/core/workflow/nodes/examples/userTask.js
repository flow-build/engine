const minimal = {
  id: "MINIMAL",
  name: "minimal user task",
  next: "NEXT",
  type: "UserTask",
  lane_id: "any",
  parameters: {
    input: {
      identity_user_data: "bag",
    },
    action: "do something",
  },
};

const complete = {
  id: "COMPLETE",
  name: "complete user task",
  next: "NEXT",
  type: "UserTask",
  lane_id: "any",
  parameters: {
    input: {},
    action: "SOME ACTION",
    encrypted_data: ["a", "b"],
    channels: ["web", "mobile"],
    timeout: 10,
    activity_schema: {
      type: "object",
      required: ["field1"],
      properties: {
        field1: { type: "string" },
      },
    },
  },
};

const wrongActivitySchema = {
  type: "object",
  properties: {
    data: { type: "string" },
    required: ["data"],
  },
};

const minimalSuccessWaiting = {
  bag: { identity_user_data: "bag" },
  error: null,
  external_input: null,
  next_node_id: "MINIMAL",
  node_id: "MINIMAL",
  result: { identity_user_data: "bag" },
  status: "waiting",
  action: "do something",
};

const minimalSuccessRunning = {
  bag: { identity_user_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "NEXT",
  node_id: "MINIMAL",
  result: { data: "external" },
  status: "running",
};

module.exports = {
  minimal,
  minimalSuccessWaiting,
  minimalSuccessRunning,
  complete,
  wrongActivitySchema,
};
