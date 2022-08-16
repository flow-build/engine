const lisp = require("../../../lisp");

const lanes = [
  {
    id: "true",
    name: "always true",
    rule: {
      lisp: ["fn", ["&", "args"], true],
    },
  },
  {
    id: "admin",
    name: "admin",
    rule: lisp.validate_claim("admin"),
  },
  {
    id: "sysAdmin",
    name: "sys_admin",
    rule: lisp.validate_claim("sys_admin"),
  },
  {
    id: "simpleton",
    name: "simpleton",
    rule: lisp.validate_claim("simpleton"),
  },
];

module.exports = {
  lanes,
};
