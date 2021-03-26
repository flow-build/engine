const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
  requirements: ["core"],
  prepare: [
    "do",
    [
      "def",
      "print_message",
      [
        "fn",
        ["message", "&", "args"],
        [
          "println",
          ["`", "Got message: "],
          "message"
        ]
      ]
    ],
    null
  ],
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
      type: "UserTask",
      name: "User node",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "userMessage",
        input: {}
      },
    },
    {
      id: "3",
      type: "ScriptTask",
      name: "Print message",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          message: {"$ref": "result.message"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "print_message",
              ["get", "input", ["`", "message"]],
            ],
          ],
        },
      },
    },
    {
      id: "4",
      type: "UserTask",
      name: "User node for manager",
      next: "5",
      lane_id: "2",
      parameters: {
        action: "managerMessage",
        input: {}
      },
    },
    {
      id: "5",
      type: "ScriptTask",
      name: "Print manager message",
      next: "6",
      lane_id: "2",
      parameters: {
        input: {
          message: {"$ref": "result.message"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "print_message",
              ["get", "input", ["`", "message"]],
            ],
          ],
        },
      },
    },
    {
      id: "6",
      type: "UserTask",
      name: "User node for admin",
      next: "7",
      lane_id: "3",
      parameters: {
        action: "adminMessage",
        input: {}
      },
    },
    {
      id: "7",
      type: "ScriptTask",
      name: "Print admin message",
      next: "8",
      lane_id: "3",
      parameters: {
        input: {
          message: {"$ref": "result.message"}
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            [
              "print_message",
              ["get", "input", ["`", "message"]],
            ],
          ],
        },
      },
    },
    {
      id: "8",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "free_for_all",
      rule: lisp.return_true()
    },
    {
      id: "2",
      name: "manager",
      rule: lisp.validate_claim("manager")
    },
    {
      id: "3",
      name: "admin",
      rule: lisp.validate_claim("admin")
    }
  ],
  environment: {},
};

const admin_data = {
  id: "1",
  claims: ["admin", "manager"]
};

const manager_data = {
  id: "2",
  claims: ["manager"]
};

const consultant_data = {
  id: "3",
  claims: ["consultant"]
};

startLogger(emitter);

const run_first_example = async () => {
  emitter.emit("===  RUNNING multiple_lanes_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("multiple_lanes_task_example",
    "multiple lanes task showcase",
    blueprint_spec);
  const process = await engine.createProcess(workflow.id, consultant_data);
  const process_id = process.id;
  await engine.runProcess(process_id, consultant_data);
  await engine.runProcess(process_id, consultant_data, { "message": "resolve user task" });

  await engine.runProcess(process_id, consultant_data, { "message": "resolve user task" });
  await engine.runProcess(process_id, manager_data, { "message": "resolve manager user task" });

  await engine.runProcess(process_id, manager_data, { "message": "resolve manager user task" });
  await engine.runProcess(process_id, admin_data, { "message": "resolve admin user task" });

  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_first_example().then(res => { emitter.emit(res); });
