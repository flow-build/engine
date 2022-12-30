const _ = require("lodash");
const { PersistedEntity } = require("./base");

class ExtraFields extends PersistedEntity {
  static getEntityClass() {
    return ExtraFields;
  }

  static serialize(extra_fields) {
    return {
      entity_id: extra_fields._entity_id,
      entity_name: extra_fields._entity_name,
      extra_fields: extra_fields._extra_fields,
    };
  }

  static deserialize(serialized) {
    if (serialized) {
      const extra_fields = new ExtraFields(
        serialized.entity_id,
        serialized.entity_name,
        _.isString(serialized?.extra_fields) ? JSON.parse(serialized?.extra_fields) : serialized?.extra_fields,
      );
      return extra_fields;
    }
    return undefined;
  }

  constructor(entity_id, entity_name, extra_fields) {
    super();
    this._entity_id = entity_id;
    this._entity_name = entity_name;
    this._extra_fields = extra_fields;
  }

  async save(trx = false, ...args) {
    return await super.save(trx, ...args);
  }
}

module.exports = {
  ExtraFields: ExtraFields
};
