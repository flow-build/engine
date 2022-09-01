const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startEventListener = require("../src/core/utils/eventEmitter");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
  requirements: [],
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
      lane_id: "1",
    },
    {
      id: "2",
      type: "Flow",
      name: "Flow node",
      parameters: {
        input: {
          decision: { $ref: "bag.input" },
        },
      },
      next: {
        value: "98",
        default: "99",
      },
      lane_id: "1",
    },
    {
      id: "98",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1",
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
      name: "the_only_lane",
      rule: lisp.return_true(),
    },
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: [],
};

startEventListener(emitter);

const run_example = async () => {
  emitter.emit("===  RUNNING multiple_finish_example  ===");
  const engine = new Engine(...settings.persist_options);

  engine.setProcessStateNotifier((process_state) => emitter.emit(process_state));

  const workflow = await engine.saveWorkflow("multiple_finish_example", "user task showcase", blueprint_spec);
  const process_without_data = await engine.createProcess(workflow.id, actor_data);
  await engine.runProcess(process_without_data.id, actor_data);

  const process_with_data = await engine.createProcess(workflow.id, actor_data, { input: "value" });
  await engine.runProcess(process_with_data.id, actor_data);
};

run_example();
