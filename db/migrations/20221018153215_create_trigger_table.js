/* eslint-disable no-unused-vars */
exports.up = function (knex, Promise) {
    return knex.schema.createTable("trigger", (table) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable();
      table.boolean("active").notNullable().defaultTo(true);
      table.boolean("resolved").notNullable().defaultTo(false);
      table.varchar("signal").notNullable();
      table.jsonb("input");
      table.timestamp("fired_at", (options = { useTz: false }));
    });
  };
  
  exports.down = function (knex, Promise) {
    return knex.schema.dropTable("trigger");
  };
  