const readlineSync = require("readline-sync");
const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");

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
      type: "UserTask",
      name: "First user task node",
      next: "3",
      lane_id: "1",
      parameters: {
        activity_manager: "notify",
        action: "userAction",
        input: {
          notifyData: "Notify user"
        },
        activity_schema: {
          type: "object",
          properties: {
            textParam: {
              type: "string"
            }
          },
          required: [ 'textParam']
        }
      }
    },
    {
      id: "3",
      type: "UserTask",
      name: "Second user task node",
      next: "99",
      lane_id: "1",
      parameters: {
        activity_manager: "notify",
        action: "userAction",
        input: {
          notifyData: "Notify user 2"
        }
      }
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: []
};

const run_example = async() => {
  console.log("===  RUNNING user_task_notify_example  ===");
  const logger = (message, data) => {
    console.log(message);
    console.log(data);
  }
  const engine = new Engine(...settings.persist_options);

  engine.setActivityManagerNotifier(logger.bind(null, 'Activity Manager'));
  engine.setProcessStateNotifier(logger.bind(null, 'Process State'));

  const workflow = await engine.saveWorkflow("user_task_example", "user task showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
}

run_example();
