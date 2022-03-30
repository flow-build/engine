exports.up = function (knex) {
  return knex.schema.table("process_state", (table) => {
    table.index(["process_id", "step_number"], "idx_ps_pid_step");
    table.index("created_at", "idx_ps_created_at");
    table.index(["created_at", "status"], "idx_ps_status_created_at");
  });
};

exports.down = function (knex) {
  return knex.schema.table("process_state", (table) => {
    table.dropIndex("idx_ps_pid_step");
    table.dropIndex("idx_ps_created_at");
    table.dropIndex("idx_ps_status_created_at");
  });
};
