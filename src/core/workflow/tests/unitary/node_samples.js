nodes_ = {};
results_ = {};

nodes_.node = {
  id: "2",
  type: "Node",
  name: "Just Node",
  next: "3",
  lane_id: "1",
};

nodes_.start = {
  id: "START",
  name: "minimal start",
  next: "CONFIG",
  type: "start",
  lane_id: "anyone",
  on_error: "stop",
  parameters: {
    input_schema: {
      type: "object",
      required: ["data"],
      properties: {
        data: { type: "string" },
      },
    },
  },
};

nodes_.finish = {
  id: "5",
  type: "Finish",
  name: "Finish Node",
  next: null,
  lane_id: "1",
  parameters: {
    input: {
      bagRef: { $ref: "bag.data" },
      paramsRef: { $ref: "parameters.data" },
      resultRef: { $ref: "result.data" },
    },
  },
};

nodes_.flow = {
  id: "FLOW",
  name: "minimal start",
  next: { 1: "3", 2: "4", default: "5" },
  type: "flow",
  lane_id: "anyone",
  on_error: "stop",
  parameters: {
    input: {
      decision_key: { $ref: "result.next_node" },
    },
  },
};

nodes_.user_task = {
  id: "4",
  type: "UserTask",
  name: "Identity User Task Node",
  next: "5",
  lane_id: "1",
  parameters: {
    action: "do something",
    input: {
      identity_user_data: { $ref: "bag.identity_user_data" },
    },
  },
};

nodes_.script_task = {
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

nodes_.system_task = {
  id: "3",
  type: "IdentityServiceTask",
  name: "Identity System Task Node",
  next: "4",
  lane_id: "1",
  parameters: {
    input: {
      identity_system_data: { $ref: "bag.identity_system_data" },
    },
  },
};

nodes_.set_to_bag_system_task = {
  id: "2",
  type: "SystemTask",
  category: "SetToBagTask",
  name: "Set to Bag Task Node",
  next: "3",
  lane_id: "1",
  parameters: {
    input: {
      destination_key: { $ref: "result.set_to_bag_data" },
    },
  },
};

nodes_.timer_system_task = {
  id: "666",
  type: "SystemTask",
  category: "Timer",
  name: "Sleep system task node",
  next: "8",
  lane_id: "1",
  parameters: {
    input: {},
    timeout: 2,
  },
};

nodes_.start_process_system_task = {
  id: "777",
  type: "SystemTask",
  category: "StartProcess",
  name: "startProcess system task node",
  next: "9",
  lane_id: "1",
  parameters: {
    workflow_name: "example_workflow",
    actor_data: {},
    input: {},
  },
};

nodes_.abort_process_system_task = {
  id: "888",
  type: "SystemTask",
  category: "AbortProcess",
  name: "abortProcess system task node",
  next: "99",
  lane_id: "1",
  parameters: {
    input: {},
  },
};

nodes_.custom_system_task = {
  id: "7",
  type: "SystemTask",
  category: "testFunction",
  name: "Custom System task node",
  next: "8",
  lane_id: "1",
  parameters: {
    input: {
      firstTestArg: { $ref: "bag.firstTestArg" },
      secondTestArg: { $ref: "bag.secondTestArg" },
    },
  },
};

nodes_.subprocess_task = {
  id: "sbtask",
  type: "SubProcess",
  name: "sub process system task node",
  next: "99",
  lane_id: "1",
  parameters: {
    actor_data: {},
    workflow_name: "any_workflow_name",
    input: {},
  },
};

results_.success_start_result = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "2",
  node_id: "1",
  result: {},
  status: "running",
};

results_.success_start_result_w_timeout = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "2",
  node_id: "1",
  result: { timeout: 5 },
  status: "running",
};

results_.success_finish_result = {
  bag: { data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: null,
  node_id: "5",
  result: {
    bagRef: "bag",
    paramsRef: "params",
    resultRef: "result",
  },
  status: "finished",
};

results_.success_user_task_result = {
  bag: { identity_user_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "5",
  node_id: "4",
  result: { data: "external" },
  status: "running",
};

results_.success_waiting_user_task_result = {
  bag: { identity_user_data: "bag" },
  error: null,
  external_input: null,
  next_node_id: "4",
  node_id: "4",
  result: { identity_user_data: "bag" },
  status: "waiting",
  action: "do something",
};

results_.success_system_task_result = {
  bag: { identity_system_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "4",
  node_id: "3",
  result: { identity_system_data: "bag" },
  status: "running",
};

results_.success_script_task_result = {
  bag: { lisp_system_data: "bag" },
  error: null,
  external_input: { data: "external" },
  next_node_id: "4",
  node_id: "3",
  result: { lisp_system_data: "bag" },
  status: "running",
};

module.exports = {
  nodes_: nodes_,
  results_: results_,
};
