const { lanes } = require("./lanes");

module.exports = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node 1",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "simpleton",
    },
    {
      id: "10",
      type: "Start",
      name: "Start node for admin",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "admin",
    },
    {
      id: "2",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "true",
    },
  ],
  lanes,
  environment: {},
};
