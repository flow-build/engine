/* eslint-disable indent */
const _ = require("lodash");
const mustache = require("mustache");
const handlebars = require("handlebars");
const crypto_manager = require("../crypto_manager");
const { VM } = require('vm2');


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

  const opKeys = Object.keys(source).filter(key => key[0] === "$");

  if (opKeys.length > 1) {
    throw new Error("More than one '$' found");
  }

  const op = opKeys[0]

  const operators = {
    $ref: (sourceContent, context) => _.get(context, sourceContent),
    $mustache: (sourceContent, context) => mustache.render(sourceContent, context),
    $handlebars: (sourceContent, context) => handlebars.compile(sourceContent)(context),
    $minimal: (sourceContent, context, interpreters) => interpreters['$minimal'].eval(["let", _.flatten(Object.entries(context)), sourceContent]),
    $decrypt: (sourceContent, context) => crypto_manager.getCrypto().decrypt(_.get(context, sourceContent)),
    $js: (sourceContent, context) => {
      const expression = `const func = ${sourceContent}; func(context)`
      const vm = new VM({ sandbox: { context: _.cloneDeep(context) } })
      return vm.run(expression)
    },
    $map: (sourceContent, context, interpreters) => {
      const { array, value } = sourceContent;
      const list = prepare(array, context, interpreters);
      return list instanceof Array ? list.map((item) => prepare(value, item, interpreters)) : list;
    },
  }

  const processor = operators[op]

  if (typeof processor === 'undefined') {
    return Object.keys(source).reduce((obj, key) => ({ ...obj, [key]: prepare(source[key], context, interpreters) }), {})
  }

  try {
    return processor(source[op], context, interpreters);
  } catch (cause) {
    throw new Error(`Error while evaluating ${op}: ${source[op]}\n${cause.message}`, { cause })
  }
}

module.exports = {
  prepare: prepare,
};
