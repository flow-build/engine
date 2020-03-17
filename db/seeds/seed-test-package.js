const uuid = require("uuid/v1");
const { core_package,
        test_package } = require("./packages/packages");

exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('packages').del()
    .then(function () {
      // Inserts seed entries
      return knex('packages').insert([
        {
          id: uuid(),
          created_at: new Date(),
          name: "test_package",
          description: "Workflow Lisp test package",
          code: JSON.stringify(test_package)
        },
        {
          id: uuid(),
          created_at: new Date(),
          name: "core",
          description: "Workflow Lisp core package",
          code: JSON.stringify(core_package)
        }
      ]);
    });
};
