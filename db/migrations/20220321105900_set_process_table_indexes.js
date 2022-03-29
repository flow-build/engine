exports.up = function (knex) {
  return knex.schema.table("process", (table) => {
    table.index("current_state_id", "idx_current_psid");
    table.index(["current_state_id", "current_status"], "idx_current_psid_status");
    table.index(["created_at", "workflow_id"], "idx_wid_created");
  });
};

exports.down = function (knex) {
  return knex.schema.table("process", (table) => {
    table.dropIndex("idx_current_psid");
    table.dropIndex("idx_current_psid_status");
    table.dropIndex("idx_wid_created");
  });
};
