const _ = require("lodash");
const nodeu = require("./node");
const { Lane } = require("../workflow/lanes")

function getNodesByType(spec, type) {
  const nodes = spec.nodes;
  if (nodes) {
    return nodes.filter(node_spec => node_spec.type == type);
  }
  return [];
}

function getNodeById(spec, node_id) {
  return _.find(spec.nodes, { id: node_id });
}

function getStartNodes(spec) {
  return getNodesByType(spec, "Start");
}

function getAllowedStartNodes(spec, actor_data, bag, custom_lisp) {
  const allowed_start_nodes = [];
  const start_nodes = getStartNodes(spec);
  for (const start_node of start_nodes) {
    const lane_spec = getLaneById(spec, start_node.lane_id);
    const is_allowed = Lane.runRule(lane_spec, actor_data, bag, custom_lisp);
    if (is_allowed) {
      allowed_start_nodes.push(start_node);
    }
  }

  return allowed_start_nodes;
}

function getNodeIds(spec) {
  return spec.nodes.map(node_spec => { return node_spec.id; });
}

function getNodeLaneIds(spec) {
  return spec.nodes.map(node_spec => { return node_spec.lane_id; });
}

function getLaneIds(spec) {
  return spec.lanes.map(lane_spec => { return lane_spec.id; });
}

function getLaneById(spec, lane_id) {
  const lanes = spec.lanes.filter((lane_spec) => lane_spec.id === lane_id);
  if (lanes.length !== 1) {
    throw new Error(`Error finding lane with id: ${lane_id}`);
  }
  return lanes[0];
}

function getNextNodeIds(spec) {
  const nodes = spec.nodes;
  const nodes_next_arr = nodes.map(node_spec => { return nodeu.getNextIds(node_spec); });
  const next_node_ids = nodes_next_arr.reduce((acc, arr) => { return [...acc, ...arr]; }, []);
  return new Set(next_node_ids);
}

function getLaneByNodeId(spec, node_id) {
  const nodes_spec = spec.nodes;
  const node_spec = _.find(nodes_spec, { id: node_id });
  if (node_spec) {
    const lanes_spec = spec.lanes;
    return _.find(lanes_spec, { id: node_spec.lane_id });
  }
  return undefined;
}

function countNodesByType(spec, type) {
  return getNodesByType(spec, type).length;
}

function hasValidStartNodes(spec) {
  const start_nodes = getStartNodes(spec);
  let is_valid = true;
  if (start_nodes.length === 0) {
    is_valid = false;
  } else {
    const start_groups = _.groupBy(start_nodes, 'lane_id');
    const list_start_group = Object.values(start_groups);
    let list_start_group_index = 0;
    while (is_valid && list_start_group_index < list_start_group.length) {
      if (list_start_group[list_start_group_index].length > 1) {
        is_valid = false;
      } else {
        list_start_group_index++;
      }
    }
  }

  return is_valid;
}

function hasAtLeastOneFinishNode(spec) {
  return countNodesByType(spec, "Finish") >= 1;
}

function areAllNodesPresent(spec) {
  const node_ids = getNodeIds(spec);
  const next_node_ids = getNextNodeIds(spec);
  for (const next_node_id of next_node_ids) {
    if (next_node_id && !node_ids.includes(next_node_id)) {
      return false;
    }
  }
  return true;
}

function areAllLanesPresent(spec) {
  const lane_ids = getLaneIds(spec);
  const node_lane_ids = getNodeLaneIds(spec);
  for (const node_lane_id of node_lane_ids) {
    if (node_lane_id && !lane_ids.includes(node_lane_id)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  getNodesByType: getNodesByType,
  getNodeById: getNodeById,
  getStartNodes: getStartNodes,
  getAllowedStartNodes: getAllowedStartNodes,
  getNodeIds: getNodeIds,
  getNodeLaneIds: getNodeLaneIds,
  getLaneIds: getLaneIds,
  getNextNodeIds: getNextNodeIds,
  getLaneByNodeId: getLaneByNodeId,
  countNodesByType: countNodesByType,
  hasValidStartNodes: hasValidStartNodes,
  hasAtLeastOneFinishNode: hasAtLeastOneFinishNode,
  areAllNodesPresent: areAllNodesPresent,
  areAllLanesPresent: areAllLanesPresent
};
