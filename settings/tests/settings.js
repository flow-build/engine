const { runMemorySeeds } = require("./memory_seeds");
const db = require("../../src/core/db");

const settings = {};

async function memory_setup () {
  await runMemorySeeds();
}

if (process.env.test_persist_option === "memory") {
  settings.persist_options = ["memory", undefined];
  memory_setup();
} else {
  settings.persist_options = ["knex", db];
}

module.exports = settings;
