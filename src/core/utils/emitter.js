const Eventemitter2 = require("eventemitter2");
module.exports = emitter = new Eventemitter2({
  wildcard: true,
  delimiter: ".",
  maxListeners: 50,
});
