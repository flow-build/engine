const _ = require("lodash");
const { Events } = require("../base");
const samples = require("./examples/eventObjects");
const { PersistorProvider } = require("../../../persist/provider");
const settings = require("../../../../../settings/tests/settings");

async function _clean() {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const timer_persist = persistor.getPersistInstance("Timer");
  await timer_persist.deleteAll();
}

beforeEach(async () => {
  await _clean();
});

describe("Events", () => {
  test("constructor works", async () => {
    const event = new Events(samples.targetMinimal);
    expect(event._definition).toEqual(samples.targetMinimal.definition);
    expect(event._family).toEqual(samples.targetMinimal.family);
    expect(event._category).toEqual(samples.targetMinimal.category);
    expect(event._input).toEqual(samples.targetMinimal.input);
    expect(event._key).toEqual(samples.targetMinimal.key);
    expect(event._code).toEqual(samples.targetMinimal.code);
    expect(event._rule).toEqual(samples.targetMinimal.rule);
    expect(event._dueDate).toEqual(samples.targetMinimal.dueDate);
    expect(event._cycle).toEqual(samples.targetMinimal.cycle);
    expect(event._duration).toEqual(samples.targetMinimal.duration);
    expect(event._nodes).toEqual(samples.targetMinimal.nodes);
  });

  test("constructor lowercases", async () => {
    let sample = _.cloneDeep(samples.targetMinimal);
    sample.definition = "ABCDE";
    sample.family = "FOO";
    sample.category = "BAR";
    const event = new Events(sample);
    expect(event._definition).toEqual("abcde");
    expect(event._family).toEqual("foo");
    expect(event._category).toEqual("bar");
  });

  test("constructor lowercases", async () => {
    let sample = _.cloneDeep(samples.targetMinimal);
    delete sample.definition;
    delete sample.family;
    delete sample.category;
    const event = new Events(sample);
    expect(event._definition).toBeUndefined();
    expect(event._family).toBeUndefined();
    expect(event._category).toBeUndefined();
  });
});

describe("validation", () => {
  test("works", () => {
    const sample = _.cloneDeep(samples.targetMinimal);
    const myEvent = new Events(sample);
    const result = myEvent.validate();
    expect(result.isValid).toBeTruthy();
    expect(result.errors).toBeNull();
  });

  test("prevent invalid family enums", () => {
    let sample = _.cloneDeep(samples.targetMinimal);
    sample.family = "bar";
    const myEvent = new Events(sample);
    const result = myEvent.validate();
    expect(result.isValid).toBeFalsy();
    expect(result.errors.length).toEqual(1);
  });

  test("prevent invalid category enums", () => {
    let sample = _.cloneDeep(samples.targetMinimal);
    sample.category = "bar";
    const myEvent = new Events(sample);
    const result = myEvent.validate();
    expect(result.isValid).toBeFalsy();
    expect(result.errors.length).toEqual(1);
  });

  test("return all errors", () => {
    let sample = _.cloneDeep(samples.targetMinimal);
    sample.family = "bar";
    sample.category = "bar";
    const myEvent = new Events(sample);
    const result = myEvent.validate();
    expect(result.isValid).toBeFalsy();
    expect(result.errors.length).toEqual(2);
  });
});

describe("create", () => {
  test("return an error if no resolver is found", async () => {
    let sample = _.cloneDeep(samples.timer.dueDate);
    sample.category = "link";
    const myEvent = new Events(sample);
    const result = await myEvent.create();
    expect(result.errors).toBeDefined();
  });

  describe("timer", () => {
    test("post a dueDate timer job", async () => {
      let sample = _.cloneDeep(samples.timer.dueDate);
      sample.dueDate = new Date(new Date().getTime() + 1000).toISOString();
      const myEvent = new Events(sample);
      const result = await myEvent.create();
      expect(result.errors).toBeUndefined();
      expect(result.id).toBeDefined();
      expect(result.delay).toBeDefined();
    });

    test("post a duration timer job", async () => {
      const sample = _.cloneDeep(samples.timer.duration);
      const myEvent = new Events(sample);
      const result = await myEvent.create();
      expect(result.errors).toBeUndefined();
      expect(result.id).toBeDefined();
      expect(result.delay).toBeDefined();
    });

    test("return an error if cannot resolve duration", async () => {
      let sample = _.cloneDeep(samples.timer.duration);
      delete sample.duration;
      const myEvent = new Events(sample);
      const result = await myEvent.create();
      expect(result.errors).toBeDefined();
      expect(result.id).toBeUndefined();
    });

    test("return an error if event is not valid", async () => {
      let sample = _.cloneDeep(samples.targetMinimal);
      sample.family = "bar";
      const myEvent = new Events(sample);
      const result = await myEvent.create();
      expect(result.errors).toBeDefined();
      expect(result.id).toBeUndefined();
    });
  });
});
