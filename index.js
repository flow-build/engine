const { Engine } = require("./src/engine/engine");
const { Cockpit } = require("./src/cockpit/cockpit");

const Nodes = require("./src/core/workflow/nodes/index.js");
const { nodefyFunction, nodefyClass } = require("./src/core/utils/nodefy");
const { ProcessStatus } = require("./src/core/workflow/process_state");
const { getNode, addSystemTaskCategory, addNodesBlackList,
  getNodeCategories, getNodeTypes } = require("./src/core/utils/node_factory");
const { Validator } = require("./src/core/validators");
const { prepare } = require("./src/core/utils/input");
const { ENGINE_ID } = require("./src/core/workflow/process_state");
const obju = require("./src/core/utils/object");

module.exports = {
  Engine: Engine,
  Cockpit: Cockpit,
  Nodes: Nodes,
  NodeUtils: {
    nodefyFunction: nodefyFunction,
    nodefyClass: nodefyClass,
    getNodeTypes,
    getNodeCategories,
  },
  ProcessStatus,
  getNode,
  addSystemTaskCategory,
  addNodesBlackList,
  utils: {
    obju: obju,
    Validator: Validator,
    ENGINE_ID: ENGINE_ID,
    prepare: prepare,
  },
};
