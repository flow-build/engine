const minimal = {
  id: "MINIMAL",
  name: "minimal user task",
  next: "NEXT",
  type: "UserTask",
  lane_id: "any",
  parameters: {
    input: {},
    action: "ANY ACTION",
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

module.exports = {
  minimal,
  complete,
  wrongActivitySchema,
};
