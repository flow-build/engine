const { Engine } = require("./src/engine/engine");
const { Cockpit } = require("./src/cockpit/cockpit");
const Nodes = require("./src/core/workflow/nodes.js");
const { nodefyFunction,
        nodefyClass } = require("./src/core/utils/nodefy");

module.exports = {
  Engine: Engine,
  Cockpit: Cockpit,
  Nodes: Nodes,
  NodeUtils: {
    nodefyFunction: nodefyFunction,
    nodefyClass: nodefyClass
  }
};
