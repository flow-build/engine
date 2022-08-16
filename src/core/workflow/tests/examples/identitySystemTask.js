const { lanes } = require("./lanes");

module.exports = {
  requirements: [],
  environment: {},
  prepare: [],
  nodes: [
    {
      id: "ist_1",
      type: "Start",
      name: "Start ist",
      parameters: {
        input_schema: {},
      },
      next: "ist_2",
      lane_id: "true",
    },
    {
      id: "ist_2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "end",
      lane_id: "true",
      parameters: {
        input: {},
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
