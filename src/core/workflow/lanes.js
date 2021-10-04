const obju = require("../utils/object");
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
    let rule_lisp;
    if (spec.rule.lisp || spec.rule.$js) {
      rule_lisp = spec.rule.lisp || spec.rule.$js;
    } else {
      rule_lisp = spec.rule;
    }

    const rule_call = [rule_lisp, actor_data, bag];
    let retval = false;

    try {
      if ( spec.rule.$js ) {
        retval = eval(spec.rule.$js)({actor_data, bag});
      } else {
        retval = lisp.evaluate(rule_call);
      }
    } catch (e) {
      emitter.emit('LANE.EVAL_ERROR', "ERROR WHILE EVALUATING LANE RULE!", { rule: rule_lisp, error: e });
    }

    return retval;
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
