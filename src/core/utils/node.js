const _ = require("lodash");

function getNextIds(node_spec) {
  next = node_spec.next;
  next_type = typeof next;
  if (next && next_type === "object") {
    return Object.values(next);
  }
  return [next];
}

function timeoutParse(parameters, execution_data = {}) {
  let parsed_timeout;
  if (parameters.timeout) {
    if (parameters.timeout.$ref) {
      parsed_timeout = _.get(execution_data, parameters.timeout.$ref);
    } else if (parameters.timeout.$js) {
      parsed_timeout = eval(parameters.timeout.$js);
    } else {
      parsed_timeout = parameters.timeout;
    }
  }
  return parsed_timeout;
}

module.exports = {
  getNextIds: getNextIds,
  timeoutParse: timeoutParse,
};
