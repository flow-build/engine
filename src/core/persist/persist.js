/* eslint-disable no-unused-vars */
const { abstractFactory } = require("../utils/factory");

class PersistorSingleton {
  static get instance() {
    return PersistorSingleton._instance;
  }
  static set instance(instance) {
    PersistorSingleton._instance = instance;
  }

  constructor(persist_class_map = {}) {
    this._persist_class_map = persist_class_map;

    if (PersistorSingleton.instance) {
      return PersistorSingleton.instance;
    }

    const PersistFactory = abstractFactory(this._persist_class_map);

    this._persists = {};
    for (const [k, v] of Object.entries(this._persist_class_map)) {
      const [persist, ...parameters] = v;
      this._persists[k] = PersistFactory(k, ...parameters);
    }
    PersistorSingleton.instance = this;
  }

  getPersistInstance(class_) {
    return this._persists[class_];
  }

  async clear() {
    const persists = Object.values(this._persists);
    await persists.forEach(async (persist) => await persist.deleteAll());
  }
}

module.exports = {
  PersistorSingleton: PersistorSingleton,
};
