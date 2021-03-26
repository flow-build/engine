const _ = require("lodash");
const bpu = require("../core/utils/blueprint");
const {Lane} = require("../core/workflow/lanes");
const {Workflow} = require("../core/workflow/workflow");
const {Blueprint} = require("../core/workflow/blueprint");
const {Process} = require("../core/workflow/process");
const {ENGINE_ID} = require("../core/workflow/process_state");
const {Packages} = require("../core/workflow/packages");
const {PersistorProvider} = require("../core/persist/provider");
const {Timer} = require("../core/workflow/timer");
const {ActivityManager} = require("../core/workflow/activity_manager");
const {ActivityStatus} = require("../core/workflow/activity");
const {setProcessStateNotifier, setActivityManagerNotifier} = require("../core/notifier_manager");
const {addSystemTaskCategory} = require("../core/utils/node_factory");
const process_manager = require("../core/workflow/process_manager");
const crypto_manager = require("../core/crypto_manager");
const startLogger = require("../core/utils/logging");
const emitter = require("../core/utils/emitter");


function getActivityManagerFromData(activity_manager_data) {
    const activity_manager = ActivityManager.deserialize(activity_manager_data);
    activity_manager.activities = activity_manager_data.activities;
    return activity_manager;
}

class Engine {

    static get instance() {
        return Engine._instance;
    }

    static set instance(instance) {
        Engine._instance = instance;
    }

    static get persistor() {
        return Engine._persistor;
    }

    static set persistor(instance) {
        Engine._persistor = instance;
    }

    static set heart(h) {
        Engine._heart = h;
    }

    static get heart() {
        return Engine._heart;
    }

    constructor(persist_mode, persist_args) {
        if (Engine.instance) {
            startLogger(emitter);
            return Engine.instance;
        }
        PersistorProvider.getPersistor(persist_mode, persist_args);
        Engine.instance = this;
        this.emitter = emitter;
        try {
            Engine.heart = Engine.setNextHeartBeat();
        } catch (e) {
            emitter.emit(e);
        }
    }

    static async _beat() {
        const TIMER_BATCH = process.env.TIMER_BATCH || 40
        const ORPHAN_BATCH = process.env.ORPHAN_BATCH || 10;
        emitter.emit(`HEARTBEAT @ ${new Date().toISOString()}`);
        await Timer.getPersist()._db.transaction(async (trx) => {
            try {
                emitter.emit(`  FETCHING TIMERS ON HEARTBEAT BATCH ${TIMER_BATCH}`);
                const locked_timers = await trx("timer")
                    .where("expires_at", "<", new Date())
                    .andWhere("active", true)
                    .limit(TIMER_BATCH)
                    .forUpdate()
                    .skipLocked();
                emitter.emit(`  FETCHED ${locked_timers.length} TIMERS ON HEARTBEAT`);
                await Promise.all(locked_timers.map((t_lock) => {
                    emitter.emit(`  FIRING TIMER ${t_lock.id} ON HEARTBEAT`);
                    const timer = Timer.deserialize(t_lock);
                    return timer.run(trx);
                }));
            } catch (e) {
                throw new Error(e);
            }
        });
        const orphan_process = await Process.getPersist()._db.transaction(async (trx) => {
            try {
                emitter.emit(`FETCHING ORPHAN PROCESSES ON HEARTBEAT BATCH ${ORPHAN_BATCH}`);
                const locked_orphans = await trx("process")
                    .select('process.*')
                    .join('process_state', 'process_state.id', 'process.current_state_id')
                    .where('engine_id', '!=', ENGINE_ID)
                    .where("current_status", "running")
                    .limit(ORPHAN_BATCH).forUpdate().skipLocked();
                emitter.emit(`  FETCHED ${locked_orphans.length} ORPHANS ON HEARTBEAT`);
                return await Promise.all(locked_orphans.map(async (orphan) => {
                    emitter.emit(`  FETCHING PS FOR ORPHAN ${orphan.id} ON HEARTBEAT`);
                    orphan.state = await trx("process_state")
                        .select().where("id", orphan.current_state_id)
                        .where('engine_id', '!=', ENGINE_ID)
                        .forUpdate().noWait()
                        .first();
                    emitter.emit(`  FETCHED PS FOR ORPHAN ${orphan.id} ON HEARTBEAT`);
                    if (orphan.state) {
                        return Process.deserialize(orphan);
                    }
                }));
            } catch (e) {
                emitter.emit("  ERROR FETCHING ORPHANS ON HEARTBEAT");
                throw new Error(e);
            }
        });
        const continue_promises = orphan_process.map((process) => {
            if (process) {
                emitter.emit(`    START CONTINUE ORPHAN PID ${process.id} AND STATE ${process.state.id} ON HEARTBEAT`);
                return process.continue({}, process.state._actor_data);
            }
        });
        await Promise.all(continue_promises);
    }

    static setNextHeartBeat() {
        return setTimeout(async () => {
            try {
                await Engine._beat();
            } catch (e) {
                emitter.emit(`HEART FAILURE @ ENGINE_ID ${ENGINE_ID}`);
                emitter.emit(e);
            } finally {
                Engine.heart = Engine.setNextHeartBeat();
                emitter.emit("NEXT HEARTBEAT SET");
            }
        }, process.env.HEART_BEAT || 1000);
    }

    static kill() {
        if (Engine.heart)
            clearTimeout(Engine.heart);
    }

    static async checkActorsPermission(activity_data_array, actor_data_array) {
        return ActivityManager.checkActorsPermission(activity_data_array, actor_data_array)
    }

    setProcessStateNotifier(process_state_notifier) {
        setProcessStateNotifier(process_state_notifier);
    }

    setActivityManagerNotifier(activity_manager_notifier) {
        setActivityManagerNotifier(activity_manager_notifier);
    }

    addCustomSystemCategory(extra_system_tasks) {
        addSystemTaskCategory(extra_system_tasks)
    }

    buildCrypto(type, data) {
        return crypto_manager.buildCrypto(type, data);
    }

    setCrypto(crypto) {
        crypto_manager.setCrypto(crypto);
    }

    async fetchAvailableActivitiesForActor(actor_data, filters = null) {
        return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.STARTED,
            actor_data,
            filters);
    }

    async fetchDoneActivitiesForActor(actor_data, filters = null) {
        return await ActivityManager.fetchActivitiesForActorFromStatus(ActivityStatus.COMPLETED,
            actor_data,
            filters);
    }

    async fetchAvailableActivityForProcess(process_id, actor_data) {
        return await ActivityManager.fetchActivityManagerFromProcessId(
            process_id,
            actor_data,
            ActivityStatus.STARTED
        );
    }

    async fetchActivityManager(activity_manager_id, actor_data) {
        return await ActivityManager.get(activity_manager_id, actor_data);
    }

    async beginActivity(process_id, actor_data) {
        const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
        if (activity_manager_data) {
            const activity_manager = getActivityManagerFromData(activity_manager_data);
            return await activity_manager.beginActivity();
        }
    }

    async commitActivity(process_id, actor_data, external_input) {
        try {
            const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
            if (activity_manager_data) {
                const activity_manager = getActivityManagerFromData(activity_manager_data);
                return await activity_manager.commitActivity(process_id, actor_data, external_input, activity_manager._parameters.activity_schema);
            } else {
                return {
                    error: {
                        errorType: 'activityManager',
                        message: "Activity manager not found"
                    }
                }
            }
        } catch (e) {
            return {
                error: {
                    errorType: 'commitActivity',
                    message: e.message
                }
            }
        }
    }

    async pushActivity(process_id, actor_data) {
        try {
            const activity_manager_data = await ActivityManager.fetchActivityManagerFromProcessId(process_id, actor_data, ActivityStatus.STARTED);
            if (activity_manager_data) {
                const activity_manager = getActivityManagerFromData(activity_manager_data);
                const [is_completed, payload] = await activity_manager.pushActivity(process_id);
                let processPromise;
                if (is_completed) {
                    const result = await process_manager.notifyCompletedActivityManager(process_id, {
                        actor_data,
                        activities: payload
                    }, activity_manager.parameters.next_step_number);
                    if (result) {
                        processPromise = result.process_promise;
                    }
                } else {
                    processPromise = Process.fetch(process_id);
                }
                return {
                    processPromise
                }
            } else {
                return {
                    error: {
                        errorType: 'activityManager',
                        message: "Activity manager not found"
                    }
                }
            }
        } catch (e) {
            return {
                error: {
                    errorType: 'pushActivity',
                    message: e.message
                }
            }
        }
    }

    async submitActivity(activity_manager_id, actor_data, external_input) {
        try {
            let activity_manager_data = await ActivityManager.get(activity_manager_id, actor_data);
            if (activity_manager_data) {
                if (activity_manager_data.activity_status === "started") {
                    const activity_manager = getActivityManagerFromData(activity_manager_data);
                    try {
                        await activity_manager.commitActivity(activity_manager_data.process_id, actor_data, external_input, activity_manager._parameters.activity_schema);
                    } catch (e) {
                        return {
                            error: {
                                errorType: 'commitActivity',
                                message: e.message
                            }
                        }
                    }
                    const [is_completed, activities] = await activity_manager.pushActivity(activity_manager_data.process_id);
                    let process_promise;
                    if (is_completed && activity_manager_data.type !== 'notify') {

                        const result = await process_manager.notifyCompletedActivityManager(activity_manager_data.process_id, {
                            actor_data,
                            activities: activities.map((activity) => activity.serialize ? activity.serialize() : activity)
                        }, activity_manager.parameters.next_step_number);
                        if (result) {
                            process_promise = result.process_promise;
                        }
                    } else {
                        process_promise = Process.fetch(activity_manager_data.process_id);
                    }
                    return {
                        processPromise: process_promise
                    };
                } else {
                    return {
                        error: {
                          errorType: 'submitActivity',
                          message: "Submit activity unavailable"
                        }
                    }
                }
            } else {
                return {
                    error: {
                      errorType: 'activityManager',
                      message: "Activity manager not found"
                    }
                }
            }
        } catch (e) {
            return {
                error: {
                    errorType: 'submitActivityUnknownError',
                    message: e.message
                }
            }
        }
    }

    async createProcessByWorkflowName(workflow_name, actor_data, initial_bag = {}) {
        return process_manager.createProcessByWorkflowName(workflow_name, actor_data, initial_bag);
    }

    async createProcess(workflow_id, actor_data, initial_bag = {}) {
        const workflow = await this.fetchWorkflow(workflow_id);
        if (workflow) {
            const created_process = await workflow.createProcess(actor_data, initial_bag);
            emitter.emit(`CREATED PROCESS OF ${workflow.name} PID ${created_process.id}`);
            return created_process;
        }
        return undefined;
    }

    async runProcess(process_id, actor_data, external_input) {
        return process_manager.runProcess(process_id, actor_data, external_input);
    }

    async fetchProcess(process_id) {
        return await Process.fetch(process_id);
    }

    async fetchProcessStateHistory(process_id) {
        const process = await Process.fetch(process_id);
        if (process) {
            return await Process.fetchStateHistory(process_id);
        }
        return undefined;
    }

    async fetchProcessList(filters = {}) {
        return await Process.fetchAll(filters);
    }

    async abortProcess(process_id) {
        const abort_result = await process_manager.abortProcess([process_id]);
        if (abort_result[0].value) {
            emitter.emit(`PROCESS ABORTED ${process_id} OF ${abort_result[0].value.workflow_name}`);
        }
        return abort_result[0].value;
    }

    async saveWorkflow(name, description, blueprint_spec) {
        return await new Workflow(name, description, blueprint_spec).save();
    }

    async fetchWorkflow(workflow_id) {
        return await Workflow.fetch(workflow_id);
    }

    async fetchWorkflowByName(workflow_name) {
        return await Workflow.fetchWorkflowByName(workflow_name);
    }

    async validateBlueprint(blueprint_spec) {
        return await Blueprint.assert_is_valid(blueprint_spec);
    }

    async deleteWorkflow(workflow_id) {
        return await Workflow.delete(workflow_id);
    }

    async savePackage(name, description, code) {
        return await new Packages(name, description, code).save();
    }

    async fetchPackage(package_id) {
        return await Packages.fetch(package_id);
    }

    async deletePackage(package_id) {
        return await Packages.delete(package_id);
    }


}

module.exports = {
    Engine: Engine,
};
