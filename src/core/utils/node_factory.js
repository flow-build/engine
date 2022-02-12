/* eslint-disable indent */
const nodes = require("../workflow/nodes/index.js");

const extra_system_category_map = {};
function getServiceTask(node_spec) {
  let resultNode;

  let node_category = node_spec.category;
  if (node_category) {
    node_category = node_category.toLowerCase();
  } else {
    throw new Error("Invalid service task, missing category on spec");
  }

  const customClass = extra_system_category_map[node_category];
  if (customClass) {
    resultNode = new customClass(node_spec);
  } else {
    switch (node_category) {
      case "http": {
        resultNode = new nodes.HttpSystemTaskNode(node_spec);
        break;
      }
      case "settobag": {
        resultNode = new nodes.SetToBagSystemTaskNode(node_spec);
        break;
      }
      case "timer": {
        resultNode = new nodes.TimerSystemTaskNode(node_spec);
        break;
      }
      case "startprocess": {
        resultNode = new nodes.StartProcessSystemTaskNode(node_spec);
        break;
      }
      case "abortprocess": {
        resultNode = new nodes.AbortProcessSystemTaskNode(node_spec);
        break;
      }
      default: {
        throw new Error(`Invalid service task, unknow category ${node_category}`);
      }
    }
  }

  return resultNode;
}

module.exports = {
  getNode(node_spec) {
    let resultNode;
    let node_type = node_spec.type;
    if (node_type) {
      node_type = node_type.toLowerCase();
    } else {
      throw new Error("Invalid node, missing type on spec");
    }
    switch (node_type) {
      case "start": {
        resultNode = new nodes.StartNode(node_spec);
        break;
      }
      case "finish": {
        resultNode = new nodes.FinishNode(node_spec);
        break;
      }
      case "flow": {
        resultNode = new nodes.FlowNode(node_spec);
        break;
      }
      case "scripttask": {
        resultNode = new nodes.ScriptTaskNode(node_spec);
        break;
      }
      case "usertask": {
        resultNode = new nodes.UserTaskNode(node_spec);
        break;
      }
      case "systemtask": {
        resultNode = getServiceTask(node_spec);
        break;
      }
      case "subprocess": {
        resultNode = new nodes.SubProcessNode(node_spec);
        break;
      }
      default: {
        throw new Error(`Invalid node, unknow type ${node_type}`);
      }
    }

    return resultNode;
  },
  addSystemTaskCategory(map_system_task_category) {
    for (const [key, value] of Object.entries(map_system_task_category)) {
      extra_system_category_map[key.toLowerCase()] = value;
    }
  },
};
