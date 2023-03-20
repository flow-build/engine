const { runMemorySeeds } = require("./tests/memory_seeds");
const db = require("../src/core/db");

const settings = {};

async function memory_setup() {
  await runMemorySeeds();
}

// settings.persist_options = ["memory", undefined];
// memory_setup();

settings.persist_options = ["knex", db];
settings.memory_setup = memory_setup;
// Persist options for different logger levels
// settings.persist_options = ["knex", db, 'silly'];

module.exports = settings;
