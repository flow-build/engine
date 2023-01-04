exports.up = function(knex) {
  if ((knex.client.config.dialect || knex.context.client.config.client) === "sqlite3") {
    return knex.schema.createTable("extra_fields", table => {
      table.uuid("entity_id").notNullable();
      table.string("entity_name", 255).notNullable();
      table.jsonb("extra_fields").notNullable();
      table.index(["entity_id", "entity_name"], "idx_entity_id_entity_name");
    });
  } else {
    return knex.raw(
      `CREATE TABLE extra_fields (
        entity_id uuid NOT NULL,
        entity_name varchar(255) NOT NULL,
        extra_fields jsonb NOT NULL
      ) PARTITION BY LIST (entity_name);
      CREATE INDEX idx_entity_id_entity_name
      ON extra_fields (entity_id, entity_name);
      CREATE TABLE extra_fields_workflow PARTITION OF extra_fields
      FOR VALUES IN ('workflow');
      CREATE TABLE extra_fields_activity_manager PARTITION OF extra_fields
      FOR VALUES IN ('activity_manager');
      CREATE TABLE extra_fields_process PARTITION OF extra_fields
      FOR VALUES IN ('process');`
    );
  }
};

exports.down = function(knex) {
  return knex.schema.dropTable("extra_fields");
};