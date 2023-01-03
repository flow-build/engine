const { v1: uuid } = require("uuid");
const { PersistorSingleton } = require("../persist/persist");

class BaseEntity {
  // eslint-disable-next-line no-unused-vars
  static serialize(instance) {
    throw Error("Subclass and implement");
  }

  // eslint-disable-next-line no-unused-vars
  static deserialize(serialized) {
    throw Error("Subclass and implement");
  }

  constructor(extra_fields) {
    this._id = uuid();
    this._created_at = new Date();
    this._extra_fields = extra_fields;
  }

  get id() {
    return this._id;
  }

  get created_at() {
    return this._created_at;
  }

  serialize() {
    return this.constructor.serialize(this);
  }
}

class PersistedEntity extends BaseEntity {
  static getEntityClass() {
    throw Error("Subclass and implement");
  }

  static getPersist() {
    return new PersistorSingleton().getPersistInstance(this.getEntityClass().name);
  }

  static async fetch(...args) {
    const serialized = await this.getPersist().get(...args);
    return this.deserialize(serialized);
  }

  static async delete(...args) {
    return await this.getPersist().delete(...args);
  }

  static async deleteAll() {
    return await this.getPersist().deleteAll();
  }

  constructor(extra_fields) {
    super(extra_fields);
  }

  getPersist() {
    return this.constructor.getPersist();
  }

  async save(...args) {
    await this.getPersist().save(this.serialize(), ...args);
    return this;
  }

  async delete(...args) {
    await this.getPersist().delete(this.id, ...args);
    return this;
  }
}

module.exports = {
  BaseEntity: BaseEntity,
  PersistedEntity: PersistedEntity,
};
