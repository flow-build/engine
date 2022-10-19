/* eslint-disable no-unused-vars */
exports.up = function (knex, Promise) {
    return knex.schema.createTable("signal", (table) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable();
      table.boolean("active").notNullable().defaultTo(false);
      table.jsonb("params");
      table.timestamp("fired_at", (options = { useTz: false }));
    });
  };
  
  exports.down = function (knex, Promise) {
    return knex.schema.dropTable("signal");
  };
  