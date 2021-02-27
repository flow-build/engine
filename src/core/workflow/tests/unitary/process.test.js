const uuid = require('uuid/v1');
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");
const { Engine } = require("../../../../engine/engine");
const { blueprints_, actors_ } = require("../../tests/unitary/blueprint_samples");
const { Process } = require("../../process");
const { ProcessStatus } = require("../../process_state");

describe("Process test", () => {
    async function cleanData() {
        const persistor = PersistorProvider.getPersistor(...settings.persist_options);
        const activity_persist = persistor.getPersistInstance("Activity");
        const activity_manager_persist = persistor.getPersistInstance("ActivityManager");
        const process_persist = persistor.getPersistInstance("Process");
        const workflow_persist = persistor.getPersistInstance("Workflow");
        const timer_persist = persistor.getPersistInstance("Timer");

        await activity_persist.deleteAll();
        await activity_manager_persist.deleteAll();
        await process_persist.deleteAll();
        await workflow_persist.deleteAll();
        await timer_persist.deleteAll();
    }

    beforeEach(async () => {
        await cleanData();
    });

    afterAll(async () => {
        await cleanData();
        if (settings.persist_options[0] === "knex") {
            await settings.persist_options[1].destroy();
        }
        Engine.kill();
    });

    describe("getNextStepNumber", () => {
        test("Add 1 to last step_number saved", async () => {
            const persistor = PersistorProvider.getPersistor(...settings.persist_options);
            const process_persist = persistor.getPersistInstance("Process");

            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            const process_id = uuid();
            let example_process = {
                id: process_id,
                workflow_id: workflow.id,
                blueprint_spec: blueprints_.minimal,
                created_at: new Date(),
                state: {
                    id: uuid(),
                    process_id: process_id,
                    step_number: 9,
                    node_id: '1',
                    next_node_id: '2',
                    bag: {},
                    external_input: null,
                    result: null,
                    error: null,
                    status: ProcessStatus.RUNNING,
                    created_at: new Date(),
                },
            };
            await process_persist.save(example_process);
            const process = await Process.fetch(process_id);

            const next_step = await process.getNextStepNumber();
            expect(next_step).toEqual(10);
        });
    });

    describe("abort", () => {
        test("process won't continue if abort called during timeout", async () => {
            try {
                let actualTimeout = setTimeout;
                function wait() {
                    return new Promise((resolve) => {
                        actualTimeout(resolve, 300);
                    });
                }
                jest.useFakeTimers();

                const engine = new Engine(...settings.persist_options);
                const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.timer);
                let process = await engine.createProcess(workflow.id, actors_.simpleton);
                const process_id = process.id;
                engine.runProcess(process_id, actors_.simpleton).catch((error) => {
                });
                await wait();
                process = await engine.fetchProcess(process_id);
                expect(process.status).toEqual(ProcessStatus.PENDING);

                await engine.abortProcess(process_id, actors_.simpleton);

                process = await engine.fetchProcess(process_id);
                expect(process.status).toEqual(ProcessStatus.INTERRUPTED);

                jest.runAllTimers();
                await wait();

                process = await engine.fetchProcess(process_id);
                expect(process.status).toEqual(ProcessStatus.INTERRUPTED);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe("setState", () => {
        test("set passed values of bag, result, next_node_id and step_number", async () => {
            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            let process = await engine.createProcess(workflow.id, actors_.simpleton);
            const process_id = process.id;

            process = await engine.fetchProcess(process_id);
            const result = await process.setState({
                bag: { bagKey: "bag value" },
                result: { resultKey: "result value" },
                next_node_id: "99",
            });

            expect(result.state).toBeDefined();
            expect(result.state.status).toEqual(ProcessStatus.PENDING);
            expect(result.state.bag).toEqual({ bagKey: "bag value" });
            expect(result.state.result).toEqual({ resultKey: "result value" });
            expect(result.state.next_node_id).toEqual("99");
            expect(result.state.process_id).toEqual(process_id);
            expect(result.state.step_number).toEqual(2);
            expect(result.state.node_id).toEqual("1");
        });

        test("notify setted state", async () => {
            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            let process = await engine.createProcess(workflow.id, actors_.simpleton);
            const process_id = process.id;

            try {
                const process_state_notifier = jest.fn();
                engine.setProcessStateNotifier(process_state_notifier)
    
                process = await engine.fetchProcess(process_id);
                const result = await process.setState({
                    bag: { bagKey: "bag value" },
                    result: { resultKey: "result value" },
                    next_node_id: "99",
                });
    
                expect(result.state).toBeDefined();
                expect(result.state.status).toEqual(ProcessStatus.PENDING);

                expect(process_state_notifier).toHaveBeenCalledTimes(1);
                const notify_call_args = process_state_notifier.mock.calls[0];
                const notified_process_state = notify_call_args[0];
                expect(notified_process_state).toBeDefined();

                expect(notified_process_state.status).toEqual(ProcessStatus.PENDING);
                expect(notified_process_state.bag).toEqual({ bagKey: "bag value" });
                expect(notified_process_state.result).toEqual({ resultKey: "result value" });
                expect(notified_process_state.next_node_id).toEqual("99");
                expect(notified_process_state.process_id).toEqual(process_id);
                expect(notified_process_state.step_number).toEqual(2);
                expect(notified_process_state.node_id).toEqual("1");
                expect(notified_process_state.workflow_name).toEqual("sample");
            } finally {
                engine.setProcessStateNotifier();
            }
        });

        test("error if process finished", async () => {
            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            let process = await engine.createProcess(workflow.id, actors_.simpleton);
            const process_id = process.id;
            await engine.runProcess(process_id, actors_.simpleton);

            process = await engine.fetchProcess(process_id);
            const result = process.setState({});

            await expect(result).rejects.toThrowError("invalid status");
        });

        test("error process finished", async () => {
            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            let process = await engine.createProcess(workflow.id, actors_.simpleton);
            const process_id = process.id;
            await engine.abortProcess(process_id);

            process = await engine.fetchProcess(process_id);
            const result = process.setState({});

            await expect(result).rejects.toThrowError("invalid status");
        });
    });

    describe("__inerLoop", () => {
        test("run condition", async () => {
            process.env.engine_id = uuid();
            const engine = new Engine(...settings.persist_options);
            const workflow = await engine.saveWorkflow("sample", "sample", blueprints_.minimal);
            let workflow_process = await engine.createProcess(workflow.id, actors_.simpleton);
            const process_id = workflow_process.id;

            const persistor = PersistorProvider.getPersistor(...settings.persist_options);
            const process_persist = persistor.getPersistInstance("Process");
            await process_persist._db.transaction(async (trx) => {
                const inner_result = await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data: actors_.simpleton}, trx)
            });

            const alternate_workflow_process = await engine.fetchProcess(process_id);
            await alternate_workflow_process.continue({}, actors_.simpleton);

            const transaction = process_persist._db.transaction(async (trx) => {
                const inner_result = await workflow_process.__inerLoop(workflow_process._current_state_id, { actor_data: actors_.simpleton}, trx)
            });
            await expect(transaction).rejects.toThrowError();

            const process_history = await engine.fetchProcessStateHistory(process_id);
            expect(process_history).toHaveLength(3);
        });
    })
});