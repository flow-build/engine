require("dotenv").config();
const { PersistedEntity } = require("./base");
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
    const variable = new EnvironmentVariable(data.key, data.value);
    variable._key = data.key;
    variable._value = this.deserializeMap(data.type, data.value);
    variable._type = data.type;
    variable._created_at = data.created_at;
    variable._updated_at = data.updated_at;
    variable._origin = data.origin || 'table';

    return variable;
  }

  static async update(key, value) {
    const type = this.getValueType(value);
    const [serialized] = await this.getPersist().update(key, value, type);
    return this.deserialize(serialized);
  }

  static async fetchAll() {
    const serialized = await this.getPersist().getAll();
    return this.deserialize(serialized);
  }

  static async fetch(key) {
    let serialized = await this.getPersist().get(key);
    if (!serialized && process.env[key]) {
      serialized = new EnvironmentVariable(key, process.env[key]);
      serialized.origin = 'environment';
    }
    return this.deserialize(serialized);
  }

  static async delete(key) {
    return await this.getPersist().delete(key);
  }

  static deserializeMap(type, value) {
    const mapper = {
      number: Number(value),
      boolean: value === "false" ? false : true,
      string: value,
      array: value,
    };

    return mapper[type];
  }

  static getValueType(value) {
    if (typeof value === 'string' && value.split(",").length > 1) {
      return "array";
    } else {
      return typeof value;
    }
  }

  constructor(key, value) {
    super();

    this._key = key;
    this._value = String(value);
    this._type = EnvironmentVariable.getValueType(value);
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
