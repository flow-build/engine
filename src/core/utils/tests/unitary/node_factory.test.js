const lodash = require("lodash");
const node_factory = require("../../node_factory");
const { nodes_: node_samples } = require("../../../workflow/tests/unitary/node_samples");
const nodes = require("../../../workflow/nodes");
const extra_nodes = require("../../../../engine/tests/utils/extra_nodes");

describe("node factory", () => {
    describe("getNode", () => {
        test("Missing type", () => {
            const node_spec = lodash.cloneDeep(node_samples.start);
            delete node_spec.type;

            expect(() => node_factory.getNode(node_spec)).toThrowError("missing type");
        })

        test("Start node", () => {
            const node = node_factory.getNode(node_samples.start);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.StartNode);
        });

        test("Finish node", () => {
            const node = node_factory.getNode(node_samples.finish);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.FinishNode);
        });

        test("Flow node", () => {
            const node = node_factory.getNode(node_samples.flow);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.FlowNode);
        });

        test("scriptTask node", () => {
            const node = node_factory.getNode(node_samples.script_task);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.ScriptTaskNode);
        });

        test("userTask node", () => {
            const node = node_factory.getNode(node_samples.user_task);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.UserTaskNode);
        });

        describe("systemTask node", () => {
            const base_service_task_node = {
                id: "3",
                type: "SystemTask",
                name: "Service Task Node",
                next: "4",
                lane_id: "1",
                parameters: {
                    input: {
                        identity_system_data: { "$ref": "bag.identity_system_data" },
                    },
                },
            };

            test("missing category", () => {
                const node_spec = {...base_service_task_node};

                expect(() => node_factory.getNode(node_spec)).toThrowError("missing category");
            });

            test("http category", () => {
                const node_spec = {
                    ...base_service_task_node,
                    category: "Http"
                };

                const node = node_factory.getNode(node_spec);

                expect(node).toBeDefined();
                expect(node).toBeInstanceOf(nodes.HttpSystemTaskNode);
            });

            test("setToBag category", () => {
                const node_spec = {
                    ...base_service_task_node,
                    category: "SetToBag"
                };

                const node = node_factory.getNode(node_spec);

                expect(node).toBeDefined();
                expect(node).toBeInstanceOf(nodes.SetToBagSystemTaskNode);
            });

            test("timer category", () => {
                const node_spec = {
                    ...base_service_task_node,
                    category: "Timer"
                };

                const node = node_factory.getNode(node_spec);

                expect(node).toBeDefined();
                expect(node).toBeInstanceOf(nodes.TimerSystemTaskNode);
            });

            test("unknow category", () => {
                const node_spec = {
                    ...base_service_task_node,
                    category: "unknow"
                };

                expect(() => node_factory.getNode(node_spec)).toThrowError("unknow category");
            });
        });

        test("Type case insensitive", () => {
            const start_spec = lodash.cloneDeep(node_samples.start);
            start_spec.type = "START";

            let node = node_factory.getNode(start_spec);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.StartNode);

            start_spec.type = "stART";

            node = node_factory.getNode(start_spec);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.StartNode);

            start_spec.type = "start";

            node = node_factory.getNode(start_spec);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(nodes.StartNode);
        });

        test("Unknow type", () => {
            const node_spec = lodash.cloneDeep(node_samples.start);
            node_spec.type = "unknowType";

            expect(() => node_factory.getNode(node_spec)).toThrowError("unknow type");
        })
    });

    describe("addSystemTaskCategory", () => {
        const base_system_task = {
            id: "3",
            type: "SystemTask",
            name: "Service Task Node",
            next: "4",
            lane_id: "1",
            parameters: {},
        };

        test("add single category", () => {
            const custom_node = extra_nodes.custom;
            const node_spec = {
                ...base_system_task,
                category: "custom"
            }

            node_factory.addSystemTaskCategory({
                custom: custom_node
            });

            const node = node_factory.getNode(node_spec);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(custom_node);
        });

        test("custom category case insensitive", () => {
            const custom_node = extra_nodes.custom;
            const node_spec = {
                ...base_system_task,
                category: "CustomCategory"
            }

            node_factory.addSystemTaskCategory({
                customCategory: custom_node
            });

            const node = node_factory.getNode(node_spec);

            expect(node).toBeDefined();
            expect(node).toBeInstanceOf(custom_node);
        });
    })
});