const settings = require("../../../../../settings/tests/settings");
const { EnvironmentVariable } = require("../../../workflow/environment_variable");
const { PersistorProvider } = require("../../../persist/provider");
const { blueprints_ } = require("./blueprint_samples");

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
  const environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1", "string");
  expect(environment_variable).toBeInstanceOf(EnvironmentVariable);
});

test("save works (create)", async () => {
  const environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1", "string");
  const variable = await environment_variable.save();
  expect(variable.key).toBe("API_HOST");
  expect(variable.value).toBe("127.0.1.1");
  expect(variable.type).toBe("string");
});

test("save works (update)", async () => {
  let created_environment_variable = new EnvironmentVariable("API_HOST", "127.0.1.1", "string");
  created_environment_variable = await created_environment_variable.save();
  let updated_environment_variable = new EnvironmentVariable("API_HOST", "0.0.0.0", "string");
  updated_environment_variable = await updated_environment_variable.save();
  expect(updated_environment_variable.key).toBe(created_environment_variable.key);
  expect(updated_environment_variable.value).toBe("0.0.0.0");
  expect(updated_environment_variable.type).toBe("string");
});

test("fetch all works", async () => {
  let environment_variable = new EnvironmentVariable("LIMIT", "9999", "number");
  environment_variable = await environment_variable.save();
  const fetched_variables = await EnvironmentVariable.fetchAll();
  expect(fetched_variables[0].key).toBe("LIMIT");
  expect(fetched_variables[0].value).toBe("9999");
  expect(fetched_variables[0].type).toBe("number");
});

test("fetch works", async () => {
  let environment_variable = new EnvironmentVariable("API_HOST", "0.0.0.0", "string");
  environment_variable = await environment_variable.save();
  const fetched_variable = await EnvironmentVariable.fetch("API_HOST");
  expect(fetched_variable.key).toBe("API_HOST");
  expect(fetched_variable.value).toBe("0.0.0.0");
});

test("delete works", async () => {
  let environment_variable = new EnvironmentVariable("LIMIT", "9999", "number");
  environment_variable = await environment_variable.save();
  await EnvironmentVariable.delete("LIMIT");
  const fetched_variable = await EnvironmentVariable.fetch("LIMIT");
  expect(fetched_variable).toBeUndefined();
});

const _clean = async () => {
  const persistor = PersistorProvider.getPersistor(...settings.persist_options);
  const environment_variable_persist = persistor.getPersistInstance("EnvironmentVariable");
  await environment_variable_persist.deleteAll();
};
