const uuid = require("uuid/v1");
const { PersistorProvider } = require("../../src/core/persist/provider");
const { core_package,
        test_package,
        test_workflow_package } = require("../../db/seeds/packages/packages");

async function runMemorySeeds() {
  const persistor = PersistorProvider.getPersistor("memory");
  const package_persistor = persistor.getPersistInstance("Packages");
  await package_persistor.save(
    {
      id: uuid(),
      created_at: new Date(),
      name: "test_package",
      description: "Workflow Lisp test package",
      code: JSON.stringify(test_package)
    }
  );
  await package_persistor.save(
    {
      id: uuid(),
      created_at: new Date(),
      name: "test_workflow_package",
      description: "Workflow to run test Workflow",
      code: JSON.stringify(test_workflow_package)
    }
  );
  await package_persistor.save(
    {
      id: uuid(),
      created_at: new Date(),
      name: "core",
      description: "Workflow Lisp core package",
      code: JSON.stringify(core_package)
    }
  );
}

module.exports = {
  runMemorySeeds
};
