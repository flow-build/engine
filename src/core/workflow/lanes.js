const obju  = require("../utils/object");
const { Validator } = require("../validators");

class Lane {

  static get rules() {
    return {
      "has_id": [obju.hasField, "id"],
      "has_name": [obju.hasField, "name"],
      "has_rule": [obju.hasField, "rule"],
      "id_has_valid_type": [obju.isFieldOfType, "id", "string"],
      "name_has_valid_type": [obju.isFieldOfType, "name", "string"],
      "rule_has_valid_type": [obju.isFieldOfType, "rule", "object"]
    };
  }

  static runRule(spec, actor_data, bag = {}, lisp) {
    const rule_lisp = spec.rule;
    const rule_call = [rule_lisp, actor_data, bag];
    return lisp.evaluate(rule_call);
  }

  static validate(spec) {
    return new Validator(this.rules).validate(spec);
  }

  constructor(lane_spec) {
    this._spec = lane_spec;
  }

  get id() {
    return this._spec["id"];
  }

  validate() {
    return Lane.validate(this._spec);
  }

  runRule(actor_data, bag, lisp) {
    return Lane.runRule(this._spec, actor_data, bag, lisp);
  }
}

module.exports = {
  Lane: Lane
};
