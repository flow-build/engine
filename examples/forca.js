const readlineSync = require("readline-sync");
const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startEventListener = require("../src/core/utils/eventEmitter");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
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
      lane_id: "1"
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Generate initial values",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          function: [
            "fn",
            ["&", "args"],
            [
              "let",
              [
                "index",
                [
                  "js",
                  [
                    ".",
                    "Math",
                    ["`", "floor"],
                    [
                      "*",
                      [".", "Math", ["`", "random"]],
                      [".", "Math", ["`", "floor"], 3],
                    ],
                  ],
                ],
                "words",
                [
                  "list",
                  ["`", "test"],
                  ["`", "game"],
                  ["`", "example"],
                ],
                "word",
                ["nth", "words", "index"],
                "state",
                [
                  "js",
                  [
                    "str",
                    ["`", "let word = '"],
                    "word",
                    ["`", "';word.replace(/./g, '_');"],
                  ],
                ],
              ],
              [
                "set",
                [
                  "set",
                  {
                    errorCount: 0,
                    isPrivate: true,
                  },
                  ["`", "state"],
                  "state"
                ],
                ["`", "word"],
                "word"
              ]
            ],
          ],
        },
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set initial values to the bag",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          word: {"$ref": "result.word"},
          state: {"$ref": "result.state"},
          errorCount: {"$ref": "result.errorCount"},
          isPrivate: {"$ref": "result.isPrivate"}
        }
      },
    },
    {
      id: "4",
      type: "UserTask",
      name: "User input letter",
      next: "5",
      lane_id: "1",
      parameters: {
        action: "letterInput",
        input: {
          state: {"$ref": "bag.state"},
          errorCount: {"$ref": "bag.errorCount"},
          isPrivate: {"$ref": "bag.isPrivate"}
        }
      },
    },
    {
      id: "5",
      type: "ScriptTask",
      name: "test",
      next: "6",
      lane_id: "1",
      parameters: {
        input: {
          userInput: {"$ref": "result.activities[0]"},
          creatorId: {"$ref": "bag.creatorId"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "let",
              [
                "inputData",
                [
                  "get",
                  ["get", "input", ["`", "userInput"]],
                  ["`", "data"],
                ],
                "letter",
                [
                  "get",
                  "inputData",
                  ["`", "letter"]
                ],
                "changePermission",
                [
                  "if",
                  [
                    "=",
                    ["get", "input", ["`", "creatorId"]],
                    ["get", "inputData", ["`", "actorId"]]
                  ],
                  true,
                  false
                ]
              ],
              [
                "set",
                [
                  "set",
                  {},
                  ["`", "inputType"],
                  [
                    "if",
                    ["null?", "letter"],
                    [
                      "if",
                      "changePermission",
                      ["`", "changePermission"],
                      ["`", "unauthorized"],
                    ],
                    ["`", "letterInput"],
                  ],
                ],
                ["`", "letterInput"],
                "letter"
              ]
            ]
          ]
        }
      },
    },
    {
      id: "6",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set input letter on bag",
      next: "7",
      lane_id: "1",
      parameters: {
        input: {
          letterInput: {"$ref": "result.letterInput"},
          inputType: {"$ref": "result.inputType"}
        }
      }
    },
    {
      id: "7",
      type: "Flow",
      name: "Control change permission or letter input",
      next: {
        unauthorized: "4",
        changePermission: "8",
        letterInput: "10",
        default: "4",
      },
      lane_id: "1",
      parameters: {
        input: {
          inputType: {"$ref": "result.inputType"}
        }
      }
    },
    {
      id: "8",
      type: "ScriptTask",
      name: "Change permission",
      next: "9",
      lane_id: "1",
      parameters: {
        input: {
          isPrivate: {"$ref": "bag.isPrivate"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "set",
              {},
              ["`", "isPrivate"],
              ["not", ["get", "input", ["`", "isPrivate"]]]
            ],
          ],
        },
      },
    },
    {
      id: "9",
      type: "SystemTask",
      category: "SetToBag",
      name: "Change isPrivate",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          isPrivate: {"$ref": "result.isPrivate"}
        }
      }
    },
    {
      id: "10",
      type: "ScriptTask",
      name: "Check input letter",
      next: "11",
      lane_id: "1",
      parameters: {
        input: {
          letterInput: {"$ref": "bag.letterInput"},
          word: {"$ref": "bag.word"},
          state: {"$ref": "bag.state"},
          errorCount: {"$ref": "bag.errorCount"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "js",
              [
                "str",
                ["`", "let input = "],
                "input",
                [
                  "`",
                  "; let letters = input.state.split(''); let index = input.word.indexOf(input.letterInput); \
                    let error = index === -1; while(index !== -1) { \
                      letters[index] = input.letterInput; index = input.word.indexOf(input.letterInput, index + 1); \
                    }; \
                    let result = {errorCount: error ? input.errorCount + 1 : input.errorCount, state: letters.join('')};result;\
                  ",
                ],
              ],
            ],
          ],
        },
      },
    },
    {
      id: "11",
      type: "SystemTask",
      category: "SetToBag",
      name: "Update error count and state",
      next: "12",
      lane_id: "1",
      parameters: {
        input: {
          errorCount: {"$ref": "result.errorCount"},
          state: {"$ref": "result.state"}
        }
      },
    },
    {
      id: "12",
      type: "ScriptTask",
      name: "Check error count",
      next: "13",
      lane_id: "1",
      parameters: {
        input: {
          state: {"$ref": "bag.state"},
          word: {"$ref": "bag.word"},
          errorCount: {"$ref": "bag.errorCount"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "set",
              {},
              ["`", "nextStep"],
              [
                "if",
                [
                  "=",
                  ["get", "input", ["`", "state"]],
                  ["get", "input", ["`", "word"]],
                ],
                ["`", "victory"],
                [
                  "if",
                  [
                    "=",
                    ["get", "input", ["`", "errorCount"]],
                    6,
                  ],
                  ["`", "defeat"],
                  ["`", "continue"],
                ],
              ],
            ],
          ],
        },
      },
    },
    {
      id: "13",
      type: "Flow",
      name: "Check next step",
      next: {
        victory: "14",
        defeat: "15",
        continue: "4",
        default: "4",
      },
      lane_id: "1",
      parameters: {
        input: {
          nextStep: {"$ref": "result.nextStep"}
        }
      },
    },
    {
      id: "14",
      type: "UserTask",
      name: "User victory",
      next: "99",
      lane_id: "1",
      parameters: {
        action: "victory",
        input: {
          state: {"$ref": "bag.state"}
        }
      },
    },
    {
      id: "15",
      type: "UserTask",
      name: "User defeat",
      next: "99",
      lane_id: "1",
      parameters: {
        action: "defeat",
        input: {
          errorCount: {"$ref": "bag.errorCount"}
        }
      },
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1",
    },
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: [
        "fn",
        ["actor_data", "bag"],
        [
          "if",
          [
            "get",
            "bag",
            ["`", "isPrivate"]
          ],
          [
            "=",
            [
              "get",
              "bag",
              ["`", "creatorId"]
            ],
            [
              "get",
              "actor_data",
              ["`", "id"]
            ]
          ],
          lisp.return_true()
        ]
      ]
    }
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: []
};

startEventListener(emitter);

const run_example = async () => {
  function log(data) {
    emitter.emit(data);
  }
  emitter.emit("===  RUNNING forca_example  ===");
  const engine = new Engine(...settings.persist_options);

  // engine.setProcessStateNotifier(log);
  engine.setActivityManagerNotifier(log);

  const workflow = await engine.saveWorkflow("user_task_example", "user task showcase", blueprint_spec);
  let process = await engine.createProcess(workflow.id, actor_data, { creatorId: actor_data.id });
  const process_id = process.id;
  process = await engine.runProcess(process_id, actor_data);
  while (process.state.status === 'waiting') {
    const external_input = readlineSync.question(
      "<Simulating external client resolution> Type something here\n");
    emitter.emit(external_input);
    await engine.commitActivity(process_id, actor_data, {
      letter: external_input[0],
      // actorId: "1"
    });
    const pushResponse = await engine.pushActivity(process_id, actor_data);
    process = await pushResponse.processPromise;
  }
}

run_example()
