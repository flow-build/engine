const { SystemTaskNode } = require("../workflow/nodes/index.js");

const _getParamNames = (func) => {
  const fnStr = func.toString();
  let result = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(/([^\s,]+)/g);
  if (result === null) result = [];
  return result;
};

const nodefyFunction = (method) => {
  const params = _getParamNames(method);
  return class CustomSystemTaskNode extends SystemTaskNode {
    // eslint-disable-next-line no-unused-vars
    async _run(execution_data, lisp) {
      let result;
      let response;
      if (params.includes("{")) {
        response = await method(execution_data);
      } else {
        const args = params.map((param_name) => {
          return execution_data[param_name];
        });
        response = await method(...args);
      }
      if (typeof response === "object" && !(response instanceof Array)) {
        result = response;
      } else {
        result = {
          data: response,
        };
      }
      return [result, "running"];
    }
  };
};

const _cleanProtoype = (methods) => {
  const index = methods.indexOf("constructor");
  if (index !== -1) methods.splice(index, 1);
};

const nodefyClass = (class_, args = []) => {
  const node_map = {};
  const instance = new class_(...args);
  const methods = Object.getOwnPropertyNames(class_.prototype);
  _cleanProtoype(methods);
  for (const method of methods) {
    try {
      node_map[method] = nodefyFunction(instance[method]);
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }
  return node_map;
};

module.exports = {
  nodefyClass,
  nodefyFunction,
};
