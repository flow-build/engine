const _ = require("lodash");

function isNotNull(obj) {
  return Boolean(obj);
}

function fieldEquals(obj, field, value) {
  return obj[field] === value;
}

function hasField(obj, field) {
  return Object.keys(obj).includes(field);
}

function hasManyKeys(obj, field) {
  return Object.keys(obj).length === Number(field);
}

function isFieldOfType(obj, field, type) {
  return typeof obj[field] == type;
}

function isFieldTypeIn(obj, field, types) {
  return types.includes(typeof obj[field]);
}

function nestedRule(obj, path, validation, field=null, args=null) {
  const target_obj = _.get(obj, path);
  try {
    return module.exports[validation](target_obj, field, args);
  } catch (err) {
    throw new Error("Validation error: " + err);
  }
}

function convertWithMapper(obj, mapper) {
  const assoc_key_value = (acc, [from, to]) => {
    acc[to] = obj[from];
    return acc;
  };

  return Object.entries(mapper).reduce(assoc_key_value, {});
}

module.exports = {
  isNotNull: isNotNull,
  fieldEquals: fieldEquals,
  hasField: hasField,
  hasManyKeys: hasManyKeys,
  isFieldOfType: isFieldOfType,
  isFieldTypeIn: isFieldTypeIn,
  nestedRule: nestedRule,
  convertWithMapper: convertWithMapper,
};
