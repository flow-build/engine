const readline = require('readline');
const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

function question(text) {
  const lineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    lineInterface.question(text, (input) => {
      resolve(input)
      lineInterface.close();
    });
  })
}

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
      name: "User task node",
      next: "99",
      lane_id: "1",
      parameters: {
        action: "userAction",
        input: {},
        timeout: 10,
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

startLogger(emitter);

const run_example = async () => {

  emitter.emit("===  RUNNING user_task_timeout_example  ===");
  const engine = new Engine(...settings.persist_options);

  let process_ended = false;
  engine.setProcessStateNotifier(
    (processState) => {
      emitter.emit(processState);
      if (processState.status === 'finished') {
        process_ended = true;
      }
    }
  );

  const workflow = await engine.saveWorkflow("user_task_timeout_example", "user task timeout showcase", blueprint_spec);
  const process = await engine.createProcess(workflow.id, actor_data);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);

  const external_input = await question(
    "<Simulating external client resolution> Type something here\n"
  );
  if (process_ended) {
    emitter.emit('Process ended');
  } else {
    await engine.commitActivity(process_id, actor_data, { userInput: external_input });

    let submitActivity;
    do {
      submitActivity = await question(
        'Submit activity?\n'
      );
    } while (submitActivity !== 'yes' && !process_ended);

    if (process_ended) {
      emitter.emit('Process ended');
    } else {
      const pushResponse = await engine.pushActivity(process_id, actor_data);
      await pushResponse.processPromise;
    }
  }

}

run_example();
