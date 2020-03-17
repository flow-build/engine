const _ = require("lodash");
const obju = require("./utils/object");

class Validator {

  // rules is a map of "rule_name": [rule_function, ...rule_args]
  constructor(rules) {
    if (rules) {
      this._rules = this._buildRules(rules);
    }
    else {
      this._rules = {};
    }
  }

  // should either be of the form
  // [rule_fn, ...rule_args] or
  // [Validator, nested_field]
  _rulePartial(rule_fn_data) {
    const rule_fn = rule_fn_data[0];
    const rule_args = rule_fn_data.slice(1);
    if (rule_fn instanceof Validator) {
      return obj => {
        return rule_fn.validate(_.get(obj, rule_args[0]));
      }
    }
    return obj => rule_fn(obj, ...rule_args);
  }

  _buildRules(rules) {
    const build_rule = (rules_map, rule) => {
      const rule_name = rule[0];
      let rule_fn_data = rule[1];
      if (typeof rule_fn_data[0] === "string") {
        rule_fn_data[0] = obju[rule_fn_data[0]];
      }
      rules_map[rule_name] = this._rulePartial(rule_fn_data);
      return rules_map;
    };
    const rules_arr = Object.entries(rules);
    return rules_arr.reduce(build_rule, {});
  }

  validate(obj) {
    const rules = Object.entries(this._rules);
    for (const rule of rules) {
      const rule_name = rule[0];
      const rule_fn = rule[1];
      const result = rule_fn(obj);
      if (typeof result == "object") {
        if (!result[0]) {
          return [false, result[1]];
        }
      }
      else if (!result) {
        return [false, rule_name];
      }
    }
    return [true, null];
  }
}

module.exports = {
  Validator: Validator
};
