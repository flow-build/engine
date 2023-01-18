/* eslint-disable indent */
const _ = require("lodash");
const mustache = require("mustache");
const handlebars = require("handlebars");
const crypto_manager = require("../crypto_manager");

handlebars.registerHelper("centesimal", function (number) {
  const retval = "" + (Number(number) / 100).toFixed(2);
  return retval.replace(".", ",");
});

handlebars.registerHelper("mul", function (a, b) {
  return a * b;
});

handlebars.registerHelper("sum", function (a, b) {
  return a + b;
});

handlebars.registerHelper("sub", function (a, b) {
  return a - b;
});

handlebars.registerHelper("div", function (a, b) {
  return a / b;
});

function prepare(source, context = {}, interpreters = {}) {

  if (!source || typeof source !== "object") {
    return source
  }

  if (source instanceof Array) {
    return source.map((item) => prepare(item, context));
  }

  let last_result;
  let op;
  for (let key of Object.keys(source)) {
    if (key[0] === "$") {
      if (op) {
        throw new Error("More than one '$' found");
      }
      op = key;
    }
  }

  switch (op) {
    case "$ref": {
      last_result = _.get(context, source[op]);
      break;
    }
    case "$mustache": {
      last_result = mustache.render(source[op], context);
      break;
    }
    case "$handlebars": {
      const template = handlebars.compile(source[op]);
      last_result = template(context);
      break;
    }
    case "$js": {
      const contextCopy = _.cloneDeep(context);
      last_result = eval(source[op])(contextCopy);
      break;
    }
    case "$minimal": {
      const contextCopy = _.cloneDeep(context);
      const listKeyValues = _.flatten(Object.entries(contextCopy));
      last_result = interpreters[op].eval(["let", listKeyValues, source[op]]);
      break;
    }
    case "$decrypt": {
      const crypto = crypto_manager.getCrypto();
      const crypted_value = _.get(context, source[op]);
      last_result = crypto.decrypt(crypted_value);
      break;
    }
    case "$map": {
      const { array, value } = source[op];
      const list = prepare(array, context, interpreters);
      if (list instanceof Array) {
        last_result = list.map((item) => prepare(value, item));
      } else {
        last_result = list;
      }
      break;
    }
    default: {
      last_result = {};
      for (let [key, value] of Object.entries(source)) {
        last_result[key] = prepare(value, context);
      }
      break;
    }
  }

  return last_result;
}

module.exports = {
  prepare: prepare,
};
