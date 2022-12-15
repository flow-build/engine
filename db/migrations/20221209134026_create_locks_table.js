/* eslint-disable no-unused-vars */
exports.up = function (knex, Promise) {
    return knex.schema.createTable("locks", (table) => {
      table.uuid("id").primary();
      table.timestamp("created_at").notNullable();
      table.timestamp("blocked_at");
      table.timestamp("released_at");
      table.boolean("active").notNullable();
      table.uuid("workflow_id").notNullable();
      table.varchar("node_id").notNullable();
      table.jsonb("block_reason").notNullable();
      table.jsonb("release_condition").notNullable();
    });
  };
  
  exports.down = function (knex, Promise) {
    return knex.schema.dropTable("locks");
  };
  