const { runMemorySeeds } = require("./tests/memory_seeds");
const db = require("../src/core/db");

const settings = {};

async function memory_setup () {
  await runMemorySeeds();
}


settings.persist_options = ["memory", undefined];
memory_setup();

// settings.persist_options = ["knex", db];

module.exports = settings;
