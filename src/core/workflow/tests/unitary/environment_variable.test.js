const settings = require("../../../../../settings/tests/settings");
const { EnvironmentVariable } = require("../../../workflow/environment_variable");
const { PersistorProvider } = require("../../../persist/provider");

beforeEach(async () => {
  await _clean();
});

afterAll(async () => {
  await _clean();
  if (settings.persist_options[0] === "knex") {
    const persist = EnvironmentVariable.getPersist();
    await persist._db.destroy();
  }
});

test("constructor works", () => {
  const environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1");
  expect(environment_variable).toBeInstanceOf(EnvironmentVariable);
});

test("save string variable works", async () => {
  const environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1");
  const variable = await environment_variable.save();
  expect(variable.key).toBe("API_HOST");
  expect(variable.value).toBe("127.0.1.1");
  expect(variable.type).toBe("string");
});

test("save number variable works", async () => {
  const environment_variable = new EnvironmentVariable("MAX_LIMIT", 123456);
  const variable = await environment_variable.save();
  expect(variable.key).toBe("MAX_LIMIT");
  expect(variable.value).toBe("123456");
  expect(variable.type).toBe("number");
});

test("save array variable works", async () => {
  const environment_variable = new EnvironmentVariable("RESPONSE_CODES", "200,202,400");
  const variable = await environment_variable.save();
  expect(variable.key).toBe("RESPONSE_CODES");
  expect(variable.value).toEqual("200,202,400");
  expect(variable.type).toBe("array");
});

test("save boolean variable works", async () => {
  const environment_variable = new EnvironmentVariable("MQTT", true);
  const variable = await environment_variable.save();
  expect(variable.key).toBe("MQTT");
  expect(variable.value).toEqual("true");
  expect(variable.type).toBe("boolean");
});

test("update works", async () => {
  let created_environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1");
  created_environment_variable = await created_environment_variable.save();
  let updated_environment_variable = await EnvironmentVariable.update("API_HOST", "0.0.0.0");
  expect(updated_environment_variable.key).toBe(created_environment_variable.key);
  expect(updated_environment_variable.value).toBe("0.0.0.0");
  expect(updated_environment_variable.type).toBe("string");
  expect(updated_environment_variable.created_at).toEqual(created_environment_variable.created_at);
  expect(updated_environment_variable._updated_at).toBeDefined();
});

test("fetch all works", async () => {
  let environment_variable = new EnvironmentVariable("LIMIT", 9999);
  await environment_variable.save();
  const fetched_variables = await EnvironmentVariable.fetchAll();
  expect(fetched_variables[0].key).toBe("LIMIT");
  expect(fetched_variables[0].value).toBe(9999);
  expect(fetched_variables[0].type).toBe("number");
});

test("fetch string variable works", async () => {
  let environment_variable = new EnvironmentVariable("API_HOST", "0.0.0.0");
  await environment_variable.save();
  const fetched_variable = await EnvironmentVariable.fetch("API_HOST");
  expect(fetched_variable.key).toBe("API_HOST");
  expect(fetched_variable.value).toBe("0.0.0.0");
});

test("fetch number variable works", async () => {
  let environment_variable = new EnvironmentVariable("MAX_LIMIT", 123456);
  await environment_variable.save();
  const fetched_variable = await EnvironmentVariable.fetch("MAX_LIMIT");
  expect(fetched_variable.key).toBe("MAX_LIMIT");
  expect(fetched_variable.value).toBe(123456);
});

test("fetch array variable works", async () => {
  let environment_variable = new EnvironmentVariable("RESPONSE_CODES", "200,202,400");
  await environment_variable.save();
  const fetched_variable = await EnvironmentVariable.fetch("RESPONSE_CODES");
  expect(fetched_variable.key).toBe("RESPONSE_CODES");
  expect(fetched_variable.value).toEqual("200,202,400");
  expect(fetched_variable.type).toEqual("array");
});

test("fetch boolean variable works", async () => {
  let environment_variable = new EnvironmentVariable("MQTT", false);
  await environment_variable.save();
  const fetched_variable = await EnvironmentVariable.fetch("MQTT");
  expect(fetched_variable.key).toBe("MQTT");
  expect(fetched_variable.value).toEqual(false);
  expect(fetched_variable.type).toEqual("boolean");
});

test("fetch variable resolves from environment works", async () => {
  process.env.API_HOST = "127.0.0.1";

  const fetched_variable = await EnvironmentVariable.fetch("API_HOST");
  expect(fetched_variable.key).toBe("API_HOST");
  expect(fetched_variable.value).toBe("127.0.0.1");
  expect(fetched_variable.type).toBe("string");
  expect(fetched_variable._origin).toBe("environment");
});

test("fetch variable resolves from table before environment works", async () => {
  process.env.API_HOST = "127.0.0.1";
  const environment_variable = new EnvironmentVariable("API_HOST", "0.0.0.0");
  await environment_variable.save();

  const fetched_variable = await EnvironmentVariable.fetch("API_HOST");
  expect(fetched_variable.key).toBe("API_HOST");
  expect(fetched_variable.value).toBe("0.0.0.0");
  expect(fetched_variable.type).toBe("string");
  expect(fetched_variable._origin).toBe("table");
});

test("delete works", async () => {
  let environment_variable = new EnvironmentVariable("LIMIT", 9999);
  await environment_variable.save();
  await EnvironmentVariable.delete("LIMIT");
  const fetched_variable = await EnvironmentVariable.fetch("LIMIT");
  expect(fetched_variable).toBeUndefined();
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const environment_variable_persist = persistor.getPersistInstance("EnvironmentVariable");
  await environment_variable_persist.deleteAll();
};
