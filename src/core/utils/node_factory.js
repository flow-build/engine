/* eslint-disable indent */
const nodes = require("../workflow/nodes/index.js");
let mobileWhiteList = [];

const types = {
  start: nodes.StartNode,
  finish: nodes.FinishNode,
  flow: nodes.FlowNode,
  scripttask: nodes.ScriptTaskNode,
  usertask: nodes.UserTaskNode,
  systemtask: nodes.SystemTaskNode,
  subprocess: nodes.SubProcessNode,
};

let categories = {
  http: nodes.HttpSystemTaskNode,
  settobag: nodes.SetToBagSystemTaskNode,
  timer: nodes.TimerSystemTaskNode,
  startprocess: nodes.StartProcessSystemTaskNode,
  abortprocess: nodes.AbortProcessSystemTaskNode,
  formrequest: nodes.FormRequestNode,
};

function getNodeTypes() {
  return types;
}

function getNodeCategories() {
  return categories;
}

function reset() {
  categories = getNodeCategories();
}

function getNode(nodeSpec) {
  const nodeType = nodeSpec.type?.toLowerCase();

  if (!nodeType) {
    throw new Error("Invalid node, missing type on spec");
  }

  let nodeClass = types[nodeType];
  if (!nodeClass) {
    throw new Error(`Invalid node, unknow type ${nodeType}`);
  }

  if (nodeClass === nodes.SystemTaskNode) {
    const nodeCategory = nodeSpec.category?.toLowerCase();
    if (!nodeCategory) {
      throw new Error("Invalid service task, missing category on spec");
    }
    nodeClass = categories[nodeCategory];

    if (!nodeClass) {
      throw new Error(`Invalid service task, unknown category ${nodeCategory}`);
    }
  }

  const resultNode = new nodeClass(nodeSpec);
  if (!resultNode) {
    throw new Error(`Invalid node, unknown type ${nodeType}`);
  }
  return resultNode;
}

function addSystemTaskCategory(customCategories) {
  if (typeof customCategories === "object") {
    for (const [key, value] of Object.entries(customCategories)) {
      categories[key.toLowerCase()] = value;
    }
  }
}

function getMobileNodes() {
  return mobileWhiteList;
}

function addMobileWhiteList(nodes) {
  mobileWhiteList = nodes;
}

module.exports = {
  getNode,
  getNodeTypes,
  getNodeCategories,
  addSystemTaskCategory,
  getMobileNodes,
  addMobileWhiteList,
  reset
};
