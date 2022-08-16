const { lanes } = require("./lanes");

module.exports = {
  name: "pizzaTest",
  description: "desc",
  blueprint_spec: {
    requirements: ["core"],
    prepare: [],
    nodes: [
      {
        id: "1",
        type: "Start",
        name: "Start node",
        parameters: {
          input_schema: {},
        },
        next: "2",
        lane_id: "true",
      },
      {
        id: "2",
        type: "ScriptTask",
        name: "Create values for bag",
        next: "3",
        lane_id: "true",
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
        id: "3",
        type: "SystemTask",
        category: "SetToBag",
        name: "Set values on bag",
        next: "4",
        lane_id: "true",
        parameters: {
          input: {
            example: { $ref: "result.example" },
            valueResult: { $ref: "result.value" },
          },
        },
      },
      {
        id: "4",
        type: "SubProcess",
        name: "Sub Process base in User task node",
        next: "5",
        lane_id: "true",
        parameters: {
          actor_data: {
            id: "2",
            claims: [],
          },
          input: {},
          workflow_name: "blueprint_spec_son",
          workflow: {
            requirements: ["core"],
            prepare: [],
            nodes: [
              {
                id: "1",
                type: "Start",
                name: "Start node",
                parameters: {
                  input_schema: {},
                },
                next: "2",
                lane_id: "true",
              },
              {
                id: "2",
                type: "ScriptTask",
                name: "Create values for bag",
                next: "3",
                lane_id: "true",
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
                id: "3",
                type: "SystemTask",
                category: "SetToBag",
                name: "Set values on bag",
                next: "4",
                lane_id: "true",
                parameters: {
                  input: {
                    example: { $ref: "result.example" },
                    valueResult: { $ref: "result.value" },
                  },
                },
              },
              {
                id: "4",
                type: "Finish",
                name: "Finish node",
                next: null,
                lane_id: "true",
              },
            ],
            lanes: [
              {
                id: "1",
                name: "default",
                rule: ["fn", ["&", "args"], true],
              },
            ],
            environment: {},
          },
          valid_response: "finished",
        },
      },
      {
        id: "5",
        type: "ScriptTask",
        name: "Print user input",
        next: "7",
        lane_id: "true",
        parameters: {
          input: {
            userInput: { $ref: "result.userInput" },
          },
          script: {
            function: [
              "fn",
              ["input", "&", "args"],
              ["println", ["`", "User input: "], ["get", "input", ["`", "userInput"]]],
            ],
          },
        },
      },
      {
        id: "7",
        type: "Finish",
        name: "Finish node",
        next: null,
        lane_id: "true",
      },
    ],
    lanes,
    environment: {},
  },
};
