exports.up = function (knex) {
  return knex.schema.table("activity", (table) => {
    table.index("activity_manager_id", "idx_activity_manager_id");
  });
};

exports.down = function (knex) {
  return knex.schema.table("activity", (table) => {
    table.dropIndex("idx_activity_manager_id");
  });
};
