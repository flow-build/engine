const { ActivityManager } = require('../../activity_manager');
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");

let package_persistor;
describe('ActivityManager', () => {
    beforeAll(async () => {
        const persistor = PersistorProvider.getPersistor(...settings.persist_options);
        package_persistor = persistor.getPersistInstance("Packages");
    });

    afterAll(async () => {
        if (settings.persist_options[0] === "knex") {
            await package_persistor._db.destroy();
        }
    });

    describe('checkActorPermission', () => {
        let activity_datas = [
            {
                node_id: '1',
                blueprint_spec: {
                    requirements: [],
                    prepare: [],
                    nodes: [
                        {
                            id: '1',
                            lane_id: '10',
                        },
                    ],
                    lanes: [
                        {
                            id: '10',
                            rule: ["fn", ["&", "args"], true],
                        },
                    ],
                },
                parameters: {},
            },
            {
                node_id: '2',
                blueprint_spec: {
                    requirements: ["core"],
                    prepare: [],
                    nodes: [
                        {
                            id: '2',
                            lane_id: '20',
                        },
                    ],
                    lanes: [
                        {
                            id: '20',
                            rule: ["fn", ["actor_data", "&", "args"], [
                                "=",
                                ["get", "actor_data", ["`", "id"]],
                                ["`", "99"]
                            ]],
                        },
                    ],
                },
                parameters: {}
            },
            {
                node_id: '3',
                blueprint_spec: {
                    requirements: ["core"],
                    prepare: [],
                    nodes: [
                        {
                            id: '3',
                            lane_id: '30',
                        },
                    ],
                    lanes: [
                        {
                            id: '30',
                            rule: ["fn", ["&", "args"], true],
                        },
                    ],
                },
                parameters: {
                    channels: ["1"]
                }
            },
        ];

        it('return all activity with valid permissions', async () => {
            const actor_data = {
                id: "99",
                channel: "1",
            };
            const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

            expect(valid_activities).toHaveLength(activity_datas.length);
            const activity_nodes = valid_activities.map(activity => activity.node_id);
            expect(activity_nodes).toContain("1");
            expect(activity_nodes).toContain("2");
            expect(activity_nodes).toContain("3");
        });

        it('filtrate activities by lane rule', async () => {
            const actor_data = {
                channel: "1",
            };
            const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

            expect(valid_activities).toHaveLength(activity_datas.length - 1);
            const activity_nodes = valid_activities.map(activity => activity.node_id);
            expect(activity_nodes).toContain("1");
            expect(activity_nodes).not.toContain("2");
            expect(activity_nodes).toContain("3");
        });

        it('filtrate activities by channel', async () => {
            const actor_data = {
                id: "99",
                channel: "2"
            };
            const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

            expect(valid_activities).toHaveLength(activity_datas.length - 1);
            const activity_nodes = valid_activities.map(activity => activity.node_id);
            expect(activity_nodes).toContain("1");
            expect(activity_nodes).toContain("2");
            expect(activity_nodes).not.toContain("3");
        })
    });
});