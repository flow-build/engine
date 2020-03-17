const { SystemTaskNode } = require("../workflow/nodes");

const _getParamNames = (func) => {
  const fnStr = func.toString();
  let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')'))
                    .match(/([^\s,]+)/g);
  if(result === null)
     result = [];
  return result;
}

const nodefyFunction = (method) => {
  const params = _getParamNames(method);
  return class CustomSystemTaskNode extends SystemTaskNode {
    async _run(execution_data, lisp) {
      const args = params.map((param_name) => {
        return execution_data[param_name];
      });
      let result;
      try {
        result = await method(...args);
      } catch(err) {
        result = {error: err};
      }
      return [result, 'running'];
    }
  }
}

const _cleanProtoype = (methods) => {
  const index = methods.indexOf("constructor");
  if (index !== -1) methods.splice(index, 1);
}

const nodefyClass = (class_, args=[]) => {
  const node_map = {};
  const instance = new class_(...args);
  const methods = Object.getOwnPropertyNames(class_.prototype);
  _cleanProtoype(methods);
  for (const method of methods) {
    try {
      node_map[method] = nodefyFunction(instance[method]);
    } catch(err) {}
  }
  return node_map;
}

module.exports = {
  nodefyClass,
  nodefyFunction
};
