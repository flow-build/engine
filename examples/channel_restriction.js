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
            type: "UserTask",
            name: "User task node",
            next: "99",
            lane_id: "1",
            parameters: {
                action: "userAction",
                channels: ["1", "2"],
                input: {}
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

const actor_data_channel_3 = {
    id: "2",
    claims: [],
    channel: "3",
}

const actor_data_channel_1 = {
    id: "3",
    claims: [],
    channel: "1",
}

startEventListener(emitter);

const run_example = async () => {
    emitter.emit("===  RUNNING channel_restriction_example  ===");
    const engine = new Engine(...settings.persist_options);
    const workflow = await engine.saveWorkflow("user_task_example", "user task showcase", blueprint_spec);
    const process = await engine.createProcess(workflow.id, actor_data);
    const process_id = process.id;
    await engine.runProcess(process_id, actor_data);

    emitter.emit("=== Activity manager without channel ===");
    try {
        const activityManager = await engine.fetchAvailableActivityForProcess(process_id, actor_data);
        emitter.emit("Activity Manager: ", activityManager);
    } catch (error) {
        emitter.emit("Error get activityManager");
    }

    emitter.emit("=== Activity manager with channel 3 ===");
    try {
        const activityManager = await engine.fetchAvailableActivityForProcess(process_id, actor_data_channel_3);
        emitter.emit("Activity Manager: ", activityManager);
    } catch (error) {
        emitter.emit("Error get activityManager");
    }

    emitter.emit("=== Activity manager with channel 1 ===");
    const activityManager = await engine.fetchAvailableActivityForProcess(process_id, actor_data_channel_1);
    emitter.emit("Activity Manager: ", activityManager);
}

run_example();