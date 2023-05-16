const { PersistedEntity } = require("./base");
const { v4: uuid } = require("uuid");
const _ = require('lodash');

class EnvironmentVariable extends PersistedEntity {
  static getEntityClass() {
    return EnvironmentVariable;
  }

  static serialize(variable) {
    return {
      key: variable._key,
      value: variable._value,
      type: variable._type,
      created_at: variable._created_at,
      updated_at: variable._updated_at,
    };
  }

  static deserialize(serialized) {
    if (!serialized) {
      return;
    }

    if (_.isArray(serialized)) {
      return serialized.map((data) => this._deserialized(data));
    } else {
      return this._deserialized(serialized);
    }
  }

  static _deserialized(data) {
    const variable = new EnvironmentVariable(data.key, data.value, data.type);
    variable._key = data.key;
    variable._value = data.value;
    variable._type = data.type;
    variable._created_at = data.created_at;
    variable._updated_at = data.updated_at;

    return variable;
  }

  static async fetchAll() {
    const serialized = await this.getPersist().getAll();
    return this.deserialize(serialized);
  }

  static async fetch(key) {
    const serialized = await this.getPersist().get(key);
    return this.deserialize(serialized);
  }

  static async delete(key) {
    return await this.getPersist().delete(key);
  }

  constructor(key, value, type) {
    super();

    this._key = key;
    this._value = value;
    this._type = type;
  }

  get key() {
    return this._key;
  }

  get value() {
    return this._value;
  }

  get type() {
    return this._type;
  }
}

module.exports.EnvironmentVariable = EnvironmentVariable;
