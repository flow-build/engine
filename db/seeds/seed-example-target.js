const { v1: uuid } = require("uuid");

exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('target').del()
    .then(function () {
      // Inserts seed entries
      return knex('target').insert([
        {
          id: uuid(),
          created_at: new Date(),
          signal: "test_signal",
          workflow_name: "test_workflow",
          active: true,
        }
      ]);
    });
};
