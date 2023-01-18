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
    return source.map((item) => prepare(item, context, interpreters));
  }

  const op = Object.keys(source).filter(key => key[0] === "$");

  if (op.length > 1) {
    throw new Error("More than one '$' found");
  }

  const operators = {
    $ref: (sourceContent, context) => _.get(context, sourceContent),
    $js: (sourceContent, context) => eval(sourceContent)(_.cloneDeep(context)),
    $mustache: (sourceContent, context) => mustache.render(sourceContent, context),
    $handlebars: (sourceContent, context) => handlebars.compile(sourceContent)(context),
    $minimal: (sourceContent, context, interpreters) => interpreters['$minimal'].eval(["let", _.flatten(Object.entries(context)), sourceContent]),
    $decrypt: (sourceContent, context) => crypto_manager.getCrypto().decrypt(_.get(context, sourceContent)),
    $map: (sourceContent, context, interpreters) => {
      const { array, value } = sourceContent;
      const list = prepare(array, context, interpreters);
      return list instanceof Array ? list.map((item) => prepare(value, item, interpreters)) : list;
    },
  }

  const processor = operators[op[0]]

  if(typeof processor === 'undefined'){
    return Object.keys(source).reduce((obj, key) => ({ ...obj, [key]: prepare(source[key], context, interpreters) }), {})
  }

  return processor(source[op[0]], context, interpreters);
}

module.exports = {
  prepare: prepare,
};
