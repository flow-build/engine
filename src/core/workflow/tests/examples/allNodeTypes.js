module.exports = {
  name: "all_node_types",
  description: "basic blueprint with all default node types",
  blueprint_spec: {
    requirements: ["core"],
    prepare: [],
    nodes: [
      {
        id: "START",
        type: "Start",
        name: "Start node",
        parameters: {
          input_schema: {},
        },
        next: "SCRIPT",
        lane_id: "1",
      },
      {
        id: "SCRIPT",
        type: "ScriptTask",
        name: "Script task node",
        next: "SETTOBAG",
        lane_id: "1",
        parameters: {
          input: {},
          script: {
            package: "",
            function: [
              "fn",
              ["&", "args"],
              {
                example: "bag_example",
                value: "bag_value",
              },
            ],
          },
        },
      },
      {
        id: "SETTOBAG",
        type: "SystemTask",
        category: "SetToBag",
        name: "SystemTask setToBag node",
        next: "SUBPROCESS",
        lane_id: "1",
        parameters: {
          input: {
            example: { $ref: "result.example" },
            valueResult: { $ref: "result.value" },
          },
        },
      },
      {
        id: "SUBPROCESS",
        type: "SubProcess",
        name: "SubProcess node",
        next: "STARTPROCESS",
        lane_id: "1",
        parameters: {
          actor_data: {
            id: "2",
            claims: [],
          },
          input: {},
          workflow_name: "blueprint_spec_son",
          valid_response: "finished",
        },
      },
      {
        id: "STARTPROCESS",
        type: "SystemTask",
        category: "startProcess",
        name: "SystemTask setToBag node",
        next: "HTTP",
        lane_id: "1",
        parameters: {
          input: {
            userInput: { $ref: "result.userInput" },
          },
          workflow_name: "blueprint_spec_son",
          actor_data: {},
        },
      },
      {
        id: "HTTP",
        type: "SystemTask",
        category: "http",
        name: "SystemTask http node",
        next: "TIMER",
        lane_id: "1",
        parameters: {
          input: {
            userInput: { $ref: "result.userInput" },
          },
          request: {
            url: "http://aurl.com",
            verb: "GET",
            headers: {},
          },
          valid_response_codes: [200, 201],
        },
      },
      {
        id: "TIMER",
        type: "SystemTask",
        category: "timer",
        name: "SystemTask timer node",
        next: "ABORTPROCESS",
        lane_id: "1",
        parameters: {
          input: {},
          timeout: 1,
        },
      },
      {
        id: "ABORTPROCESS",
        type: "SystemTask",
        category: "abortprocess",
        name: "SystemTask abort process node",
        next: "FORMREQUEST",
        lane_id: "1",
        parameters: {
          input: {},
        },
      },
      {
        id: "FORMREQUEST",
        type: "SystemTask",
        category: "formrequest",
        name: "SystemTask abort process node",
        next: "FLOW",
        lane_id: "1",
        parameters: {
          input: {
            userInput: { $ref: "result.userInput" },
          },
          request: {
            url: "http://aurl.com",
            verb: "POST",
            headers: {},
          },
          valid_response_codes: [200, 201],
        },
      },
      {
        id: "FLOW",
        type: "flow",
        name: "flow node",
        next: {
          true: "FINISH",
          default: "USERTASK",
        },
        lane_id: "1",
        parameters: {
          input: {
            decision: "false",
          },
        },
      },
      {
        id: "USERTASK",
        type: "userTask",
        name: "SystemTask abort process node",
        next: "FINISH",
        lane_id: "1",
        parameters: {
          input: {},
          action: "do something",
        },
      },
      {
        id: "FINISH",
        type: "Finish",
        name: "Finish node",
        next: null,
        lane_id: "1",
      },
    ],
    lanes: [
      {
        id: "1",
        name: "the_only_lane",
        rule: ["fn", ["&", "args"], true],
      },
    ],
    environment: {},
  },
};
