const { Engine } = require("./src/engine/engine");
const { Cockpit } = require("./src/cockpit/cockpit");

const Nodes = require("./src/core/workflow/nodes/index.js");
const { nodefyFunction, nodefyClass } = require("./src/core/utils/nodefy");
const { ProcessStatus } = require("./src/core/workflow/process_state");
const { getNode } = require("./src/core/utils/node_factory");

module.exports = {
  Engine: Engine,
  Cockpit: Cockpit,
  Nodes: Nodes,
  NodeUtils: {
    nodefyFunction: nodefyFunction,
    nodefyClass: nodefyClass,
  },
  ProcessStatus,
  getNode,
};
