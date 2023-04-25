/* eslint-disable indent */
const nodes = require("../workflow/nodes/index.js");

const types = {
  start: nodes.StartNode,
  finish: nodes.FinishNode,
  flow: nodes.FlowNode,
  scripttask: nodes.ScriptTaskNode,
  usertask: nodes.UserTaskNode,
  systemtask: nodes.SystemTaskNode,
  subprocess: nodes.SubProcessNode,
  event: nodes.EventNode,
};

let categories = {
  http: nodes.HttpSystemTaskNode,
  settobag: nodes.SetToBagSystemTaskNode,
  timer: nodes.TimerSystemTaskNode,
  startprocess: nodes.StartProcessSystemTaskNode,
  abortprocess: nodes.AbortProcessSystemTaskNode,
  formrequest: nodes.FormRequestNode,
};

let eventCategories = {
  signal: nodes.EventNode,
  timer: nodes.EventNode,
  message: nodes.EventNode,
}

function getNodeTypes() {
  return types;
}

function getNodeCategories() {
  return categories;
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

  if (nodeClass === nodes.SystemTaskNode || nodeClass === nodes.EventNode) {
    const nodeCategory = nodeSpec.category?.toLowerCase();
    if (!nodeCategory) {
      throw new Error("Invalid service task, missing category on spec");
    }

    if (nodeClass === nodes.SystemTaskNode) {
      nodeClass = categories[nodeCategory];
    } else if (nodeClass === nodes.EventNode) {
      nodeClass = eventCategories[nodeCategory];
    }

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
  for (const [key, value] of Object.entries(customCategories)) {
    categories[key.toLowerCase()] = value;
  }
}

module.exports = {
  getNode,
  getNodeTypes,
  getNodeCategories,
  addSystemTaskCategory,
};
