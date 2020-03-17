const knex = require("knex");
const { ProcessMemoryPersist,
        WorkflowMemoryPersist,
        PackagesMemoryPersist,
        ActivityManagerMemoryPersist,
        ActivityMemoryPersist } = require("../persist/memory");
const { ProcessKnexPersist,
        WorkflowKnexPersist,
        PackagesKnexPersist,
        ActivityManagerKnexPersist,
        ActivityKnexPersist } = require("../persist/knex");
const { PersistorSingleton } = require("../persist/persist");

class PersistorProvider {
  static getPersistor(persist_mode, ...args) {

    if (PersistorSingleton.instance) {
      return PersistorSingleton.instance;
    }
    let class_map;

    switch(persist_mode) {
    case "memory":
      class_map = {
        Process: [ProcessMemoryPersist],
        Workflow: [WorkflowMemoryPersist],
        Packages: [PackagesMemoryPersist],
        ActivityManager: [ActivityManagerMemoryPersist],
        Activity: [ActivityMemoryPersist]
      };
      break;
    case "knex":
      const db = args[0];
      class_map = {
        Process: [ProcessKnexPersist, db],
        Workflow: [WorkflowKnexPersist, db],
        Packages: [PackagesKnexPersist, db],
        ActivityManager: [ActivityManagerKnexPersist, db],
        Activity: [ActivityKnexPersist, db]
      };
      break;
    default:
      throw Error("Invalid persist mode");
    }
    return new PersistorSingleton(class_map);
  }
}

module.exports = {
  PersistorProvider
};
