const { has } = require('lodash')
const { PersistedEntity } = require("./base");
const lisp = require("../lisp");

class Packages extends PersistedEntity {
  static getEntityClass() {
    return Packages;
  }

  static serialize(required_package) {
    return {
      id: required_package._id,
      created_at: required_package._created_at,
      name: required_package._name,
      description: required_package._description,
      code: JSON.stringify(required_package._code),
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const required_package = new Packages(serialized.name, serialized.description, JSON.parse(serialized.code));
      required_package._id = serialized.id;
      return required_package;
    }
    return undefined;
  }

  static async fetchPackageByName(package_name) {
    const required_package = await this.getPersist().getByName(package_name);
    return Packages.deserialize(required_package);
  }

  static async _fetchPackages(requirements, prepare) {
    let custom_lisp;
    let required_codes = [];

    if (requirements.length > 0) {
      for (let requirement of requirements) {
        const required_package = await Packages.fetchPackageByName(requirement);
        required_codes.push(required_package._code);
      }
    }

    if (prepare.length > 0) {
      required_codes.push(prepare);
    }

    if (required_codes.length > 0) {
      custom_lisp = Packages._evaluateLisp(required_codes);
    } else {
      custom_lisp = lisp;
    }

    return custom_lisp;
  }

  static _evaluateLisp(required_codes) {
    const m = lisp.new_lisp();
    for (let code of required_codes) {
      has(m, 'evalb') ? m.evalb(code) : m.eval(code);
    }
    m.evaluate = function (lisp_function) {
      return has(m, 'evalb') ? m.evalb(lisp_function) : m.eval(lisp_function);;
    };
    return m;
  }

  constructor(name, description, code) {
    super();
    this._name = name;
    this._description = description;
    this._code = code;
  }

  get name() {
    return this._name;
  }

  get description() {
    return this._description;
  }

  get code() {
    return this._code;
  }
}

module.exports = {
  Packages: Packages,
};
