const minimal = {
  id: "3",
  type: "ScriptTask",
  name: "Lisp System Task Node",
  next: "4",
  lane_id: "1",
  parameters: {
    input: {
      lisp_system_data: { $ref: "bag.lisp_system_data" },
    },
    script: {
      function: ["fn", ["input", "&", "args"], "input"],
    },
  },
};

const minimalResult = {
  bag: { lisp_system_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "4",
  node_id: "3",
  result: { lisp_system_data: "bag" },
  status: "running",
};

module.exports = {
  minimal,
  minimalResult,
};
