const { v1: uuid } = require("uuid");
const _ = require("lodash");
const { ActivityManager } = require("../../activity_manager");
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");
const { ActivityStatus } = require("../../activity");
const samples = require("../examples/activityManager");
const { blueprints_ } = require("./blueprint_samples");
const { Timer } = require("../../timer");

const persistor = PersistorProvider.getPersistor(...settings.persist_options);
const workflow_persistor = persistor.getPersistInstance("Workflow");
const process_persistor = persistor.getPersistInstance("Process");
const process_state_persistor = persistor.getPersistInstance("ProcessState");
const am_persistor = persistor.getPersistInstance("ActivityManager");

const workflowId = uuid();
const processId = uuid();
let package_persistor;
beforeAll(async () => {
  await loadData();
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  package_persistor = persistor.getPersistInstance("Packages");
});

afterAll(async () => {
  await cleanData();
  if (settings.persist_options[0] === "knex") {
    await package_persistor._db.destroy();
  }
});

describe("ActivityManager", () => {
  describe("constructor", () => {
    test("should work", () => {
      const psid = uuid();
      const status = ActivityStatus.INTERRUPTED;
      const props = { action: "ANY" };
      const parameters = { foo: "bar" };
      const myAm = new ActivityManager(psid, status, props, parameters);
      expect(myAm._id).toBeDefined();
      expect(myAm._process_state_id).toEqual(psid);
      expect(myAm._status).toEqual(status);
      expect(myAm._props).toEqual(props);
      expect(myAm._parameters).toEqual(parameters);
    });

    test("should define status and type if not provided", () => {
      const mySample = _.cloneDeep(samples.minimal);
      const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
      expect(myAm._id).toBeDefined();
      expect(myAm._type).toEqual("commit");
      expect(myAm._status).toEqual(ActivityStatus.STARTED);
    });
  });

  describe("save", () => {
    test("should create an activity manager", async () => {
      const mySample = _.cloneDeep(samples.minimal);
      const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
      await myAm.save();
      const persistedAm = await ActivityManager.fetch(myAm._id);
      expect(persistedAm.id).toEqual(myAm._id);
      expect(persistedAm.activity_status).toEqual(ActivityStatus.STARTED);
      expect(persistedAm.process_state_id).toEqual(mySample.process_state_id);
      expect(persistedAm.props).toEqual(mySample.props);
      expect(persistedAm.parameters).toEqual(mySample.parameters);
    });

    test("if parameters has timeout, should create a timer", async () => {
      const mySample = _.cloneDeep(samples.withTimeout);
      const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
      await myAm.save();
      const persistedAm = await ActivityManager.fetch(myAm._id);
      expect(persistedAm.id).toEqual(myAm._id);
      expect(persistedAm.parameters.timeout).toBeDefined();
      expect(persistedAm.parameters.timeout).toEqual(30);
      expect(persistedAm.parameters.timeout_id).toBeDefined();
      //VERIFIY IF THE TIMER JOB IS CREATED
    });
  });

  test("beginActivity", () => {});
  test("commitActivity", () => {});
  test("pushActivity", () => {});
  test("interruptActivity", () => {});
  test("_validateActivity", () => {});
  test("_notifyActivityManager", () => {});
  test("timeout", () => {});
});

describe("static methods", () => {
  test("getEntityClass", () => {
    const result = ActivityManager.getEntityClass();
    expect(result).toEqual(ActivityManager);
  });

  test("serialize", () => {
    const am = _.cloneDeep(samples.activity_manager);
    const result = ActivityManager.serialize(am);
    expect(result.id).toEqual(am._id);
    expect(result.created_at).toEqual(am._created_at);
    expect(result.type).toEqual(am._type);
    expect(result.process_state_id).toEqual(am._process_state_id);
    expect(result.status).toEqual(am._status);
    expect(result.props).toEqual(am._props);
    expect(result.parameters).toEqual(am._parameters);
  });

  describe("deserialize", () => {
    test("should deserialize when a value is sent", async () => {
      //TODO: checks why it's breaking
      /*
      const am = await ActivityManager.fetch(samples.serialized.id);
      const result = ActivityManager.deserialize(am);
      expect(result).toBeDefined();
      */
    });

    test("should not break to a undefined value", () => {
      const result = ActivityManager.deserialize();
      expect(result).toBeUndefined();
    });
  });

  test("fetchActivitiesForActorFromStatus", async () => {});

  describe("checkActorPermission", () => {
    let activity_datas = [
      {
        node_id: "1",
        blueprint_spec: {
          requirements: [],
          prepare: [],
          nodes: [
            {
              id: "1",
              lane_id: "10",
            },
          ],
          lanes: [
            {
              id: "10",
              rule: ["fn", ["&", "args"], true],
            },
          ],
        },
        parameters: {},
      },
      {
        node_id: "2",
        blueprint_spec: {
          requirements: ["core"],
          prepare: [],
          nodes: [
            {
              id: "2",
              lane_id: "20",
            },
          ],
          lanes: [
            {
              id: "20",
              rule: ["fn", ["actor_data", "&", "args"], ["=", ["get", "actor_data", ["`", "id"]], ["`", "99"]]],
            },
          ],
        },
        parameters: {},
      },
      {
        node_id: "3",
        blueprint_spec: {
          requirements: ["core"],
          prepare: [],
          nodes: [
            {
              id: "3",
              lane_id: "30",
            },
          ],
          lanes: [
            {
              id: "30",
              rule: ["fn", ["&", "args"], true],
            },
          ],
        },
        parameters: {
          channels: ["1"],
        },
      },
    ];

    it("return all activity with valid permissions", async () => {
      const actor_data = {
        id: "99",
        channel: "1",
      };
      const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

      expect(valid_activities).toHaveLength(activity_datas.length);
      const activity_nodes = valid_activities.map((activity) => activity.node_id);
      expect(activity_nodes).toContain("1");
      expect(activity_nodes).toContain("2");
      expect(activity_nodes).toContain("3");
    });

    it("filtrate activities by lane rule", async () => {
      const actor_data = {
        channel: "1",
      };
      const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

      expect(valid_activities).toHaveLength(activity_datas.length - 1);
      const activity_nodes = valid_activities.map((activity) => activity.node_id);
      expect(activity_nodes).toContain("1");
      expect(activity_nodes).not.toContain("2");
      expect(activity_nodes).toContain("3");
    });

    it("filtrate activities by channel", async () => {
      const actor_data = {
        id: "99",
        channel: "2",
      };
      const valid_activities = await ActivityManager.checkActorPermission(activity_datas, actor_data);

      expect(valid_activities).toHaveLength(activity_datas.length - 1);
      const activity_nodes = valid_activities.map((activity) => activity.node_id);
      expect(activity_nodes).toContain("1");
      expect(activity_nodes).toContain("2");
      expect(activity_nodes).not.toContain("3");
    });
  });

  test("fetchActivityManagerFromProcessId", async () => {
    const result = await ActivityManager.fetchActivityManagerFromProcessId(
      processId,
      { actor_id: uuid(), claims: ["any"] },
      "any"
    );
    expect(result.id).toEqual(samples.serialized.id);
  });

  test("fetch", async () => {
    const result = await ActivityManager.fetch(samples.serialized.id);
    expect(result.id).toEqual(samples.serialized.id);
  });

  test("get", async () => {
    const result = await ActivityManager.get(samples.serialized.id, {});
    expect(result.id).toEqual(samples.serialized.id);
  });

  test("addTimeInterval", async () => {
    let timerBefore = new Timer("ActivityManager", samples.serialized.id);
    await timerBefore.retrieve();
    await ActivityManager.addTimeInterval(samples.serialized.id, 100);
    let timerAfter = new Timer("ActivityManager", samples.serialized.id);
    await timerAfter.retrieve();
    expect(timerAfter._expires_at).not.toEqual(timerBefore._expires_at);
  });

  test("setExpiredDate", async () => {
    let timerBefore = new Timer("ActivityManager", samples.serialized.id);
    await timerBefore.retrieve();
    await ActivityManager.setExpiredDate(samples.serialized.id, new Date());
    let timerAfter = new Timer("ActivityManager", samples.serialized.id);
    await timerAfter.retrieve();
    expect(timerAfter._expires_at).not.toEqual(timerBefore._expires_at);
  });

  test("interruptActivityManagerForProcess", async () => {
    //TODO: checks why it's breaking
    /*  
    let sample = samples.serialized;
    sample.id = uuid();
    sample.status = ActivityStatus.STARTED;
    await loadAm(sample);
    await ActivityManager.interruptActivityManagerForProcess(processId);
    const result = ActivityManager.fetch(sample.id);
    expect(result.activity_status).toBe(ActivityStatus.INTERRUPTED);
    */
  });

  test("finishActivityManagerForProcess", async () => {
    //TODO: checks why it's breaking
    /*  
    let sample = samples.serialized;
    sample.id = uuid();
    sample.status = ActivityStatus.STARTED;
    await loadAm(sample);
    await ActivityManager.finishActivityManagerForProcess(processId);
    const result = ActivityManager.fetch(sample.id);
    expect(result.activity_status).toBe(ActivityStatus.INTERRUPTED);
    */
  });

  test("expire", async () => {
    //TODO: checks why it's breaking. The same test running on the cockpit works
    let sample = samples.serialized;
    sample.id = uuid();
    sample.status = ActivityStatus.STARTED;
    await loadAm(sample);
    /*  
    const am = await ActivityManager.fetch(sample.id);
    await ActivityManager.expire(sample.id, am, { actor_data: { actor_id: "X" } });
    const result = ActivityManager.fetch(sample.id);
    expect(result.activity_status).toBe(ActivityStatus.COMPLETED);
    */
  });
});

describe("events", () => {
  test("should create a timer with dueDate", async () => {
    const mySample = _.cloneDeep(samples.withSingleDueDateTimerEvent);
    const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
    await myAm.save();
    const persistedAm = await ActivityManager.fetch(myAm._id);
    expect(persistedAm.id).toEqual(myAm._id);
    expect(persistedAm.parameters.timeout).toBeDefined();
    expect(persistedAm.parameters.timeout_id).toBeDefined();
  });

  test("should create a timer with duration", async () => {
    const mySample = _.cloneDeep(samples.withSingleDurationTimerEvent);
    const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
    await myAm.save();
    const persistedAm = await ActivityManager.fetch(myAm._id);
    expect(persistedAm.id).toEqual(myAm._id);
    expect(persistedAm.parameters.timeout).toBeDefined();
    expect(persistedAm.parameters.timeout_id).toBeDefined();
  });

  test("can receive multiple events", async () => {
    const mySample = _.cloneDeep(samples.withMultipleTimers);
    const myAm = new ActivityManager(mySample.process_state_id, undefined, mySample.props, mySample.parameters);
    await myAm.save();
    const persistedAm = await ActivityManager.fetch(myAm._id);
    expect(persistedAm.id).toEqual(myAm._id);
    expect(persistedAm.parameters.timeout).toBeDefined();
    expect(persistedAm.parameters.timeout_id).toBeDefined();
    expect(persistedAm.parameters.events.length).toEqual(2);
  });
});

async function loadData() {
  await workflow_persistor._db.table(workflow_persistor._table).insert({
    id: workflowId,
    created_at: new Date(),
    name: "activityManagerUnitTest",
    description: "activityManagerUnitTest",
    blueprint_spec: blueprints_.minimal,
    version: 1,
  });
  await process_persistor._db.table(process_persistor._table).insert({
    id: processId,
    created_at: new Date(),
    workflow_id: workflowId,
    blueprint_spec: blueprints_.minimal,
  });
  await process_state_persistor._db.table(process_state_persistor._table).insert({
    id: samples.process_state_id,
    created_at: new Date(),
    node_id: "minimal_1",
    step_number: 1,
    process_id: processId,
    bag: {},
    status: "waiting",
  });
  await am_persistor._db.table(am_persistor._table).insert(samples.serialized);
}

async function loadAm(am) {
  await am_persistor._db.table(am_persistor._table).insert(am);
}

async function cleanData() {
  await am_persistor._db.table(am_persistor._table).del();
  await process_state_persistor._db.table(process_state_persistor._table).del();
  await process_persistor._db.table(process_persistor._table).del();
  await workflow_persistor._db.table(workflow_persistor._table).del();
}
