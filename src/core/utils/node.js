function getNextIds(node_spec) {
  next = node_spec.next;
  next_type = typeof next;
  if (next && next_type === "object") {
    return Object.values(next);
  }
  return [next];
}


module.exports = {
  getNextIds: getNextIds
};
