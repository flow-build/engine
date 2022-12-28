require("dotenv").config();
const { has } = require('lodash');
const miniMAL = require('minimal-lisp');
const m = miniMAL(global);

const return_true = function() {
  return ["fn", ["&", "args"], true];
};

const validate_claim = function(valid_claim) {
  return ["fn", ["actor_data", "bag"],
          ["eval",
           ["apply", "or",
            ["map", ["fn", ["v"], ["=", "v", ["`", valid_claim]]],
             ["get", "actor_data", ["`", "claims"]]]]]];
};

const evaluate = function(minimal_expression) {
  return has(m, 'evalb') ? m.evalb(minimal_expression) : m.eval(minimal_expression);
};

const new_lisp = function(minimal_expression) {
  const min = miniMAL(global);
  return min;
};

module.exports = {
  return_true: return_true,
  validate_claim: validate_claim,
  evaluate: evaluate,
  new_lisp: new_lisp
};
