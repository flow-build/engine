const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "rmiut_1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "rmiut_2",
      lane_id: "admin",
    },
    {
      id: "rmiut_2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "rmiut_3",
      lane_id: "admin",
      parameters: {
        input: {},
      },
    },
    {
      id: "rmiut_3",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "rmiut_4",
      lane_id: "sysAdmin",
      parameters: {
        input: {},
      },
    },
    {
      id: "rmiut_4",
      type: "UserTask",
      name: "Userser task",
      next: "end",
      lane_id: "sysAdmin",
      parameters: {
        action: "do something",
        input: {},
      },
    },
    {
      id: "end",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
};
