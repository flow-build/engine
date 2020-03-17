const _ = require("lodash");
const assert = require("assert");
const sleep = require("sleep");
const obju = require("../utils/object");
const { prepare } = require("../utils/input");
const { ProcessStatus } = require("./process_state");
const { Validator } = require("../validators");
const { request } = require('../utils/requests');
const { ActivityStatus } = require("./activity");
const { getActivityManager } = require("../utils/activity_manager_factory");
const ajvValidator = require("../utils/ajvValidator");

const writeJsFunction = (function_name) => {
  return ["fn", ["&", "args"],
    ["js", ["str", ["`", function_name + "("], "args", ["`", ")"]]]];
};

class Node {
  static get rules() {
    return {
      "has_id": [obju.hasField, "id"],
      "has_type": [obju.hasField, "type"],
      "has_name": [obju.hasField, "name"],
      "has_next": [obju.hasField, "next"],
      "has_lane_id": [obju.hasField, "lane_id"],
      "id_has_valid_type": [obju.isFieldOfType, "id", "string"],
      "type_has_valid_type": [obju.isFieldOfType, "type", "string"],
      "next_has_valid_type": [obju.isFieldTypeIn, "next", ["string", "object"]],
      "lane_id_has_valid_type": [obju.isFieldOfType, "lane_id", "string"],
    };
  }

  static validate(spec) {
    return new Validator(this.rules).validate(spec);
  }

  constructor(node_spec = {}) {
    this._spec = node_spec;
  }

  get id() {
    return this._spec["id"];
  }

  next(result) {
    return this._spec["next"];
  }

  validate() {
    return Node.validate(this._spec);
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {} }, lisp) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment });
      const [result, status] = await this._run(
        execution_data,
        lisp
      );
      return {
        node_id: this.id,
        bag: this._setBag(bag, result),
        external_input: external_input,
        result: result,
        error: null,
        status: status,
        next_node_id: this.next(result)
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }

  // MUST RETURN [result, status]
  _run(execution_data, lisp) {
    throw Error(
      "Subclass and implement returning [result: {}, status: ProcessStatus]"
    );
  }

  _preProcessing({ bag, input, actor_data, environment }) {
    return { ...bag, ...input };
  }

  _setBag(bag, result) {
    return bag;
  }

  _processError(error, { bag, external_input }) {
    let on_error = this._spec.on_error;
    if (on_error && typeof on_error === 'string') {
      on_error = on_error.toLowerCase();
    }

    let result;
    switch (on_error) {
      case 'resumenext': {
        result = {
          node_id: this.id,
          bag: bag,
          external_input: external_input,
          result: {
            error: error,
            is_error: true,
          },
          error: null,
          status: ProcessStatus.RUNNING,
          next_node_id: this.id
        }
        break;
      }
      case 'stop':
      default: {
        result = {
          node_id: this.id,
          bag: bag,
          external_input: external_input,
          result: null,
          error: error,
          status: ProcessStatus.ERROR,
          next_node_id: this.id
        }
        break;
      }
    }

    return result;
  }
}

class StartNode extends Node {
  static get rules() {
    const parameters_inpupt_schema_rules = {
      "parameters_has_input_schema": [obju.hasField, "input_schema"],
      "input_schema_has_valid_type": [obju.isFieldOfType, "input_schema", "object"],
    }
    return {
      ...super.rules,
      "next_has_valid_type": [obju.isFieldTypeIn, "next", ["string", "number"]],
      "has_parameters": [obju.hasField, "parameters"],
      "parameters_has_valid_type": [obju.isFieldOfType, "parameters", "object"],
      "parameters_input_schema_validations": [new Validator(parameters_inpupt_schema_rules), "parameters"],
    };
  }

  validate() {
    let [is_valid, error] = StartNode.validate(this._spec);
    if (is_valid) {
      try {
        ajvValidator.validateSchema(this._spec.parameters.input_schema)
      } catch (err) {
        is_valid = false;
        error = err.message;
      }
    }
    return [is_valid, error]
  }

  _run(execution_data, lisp) {
    ajvValidator.validateData(this._spec.parameters.input_schema, execution_data.bag);
    return [execution_data.bag, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input }) {
    return { bag, input };
  }
}

class FinishNode extends Node {
  static get rules() {
    return {
      ...super.rules,
      "next_is_null": [obju.fieldEquals, "next", null]
    };
  }

  validate() {
    return FinishNode.validate(this._spec);
  }

  _run(execution_data, lisp) {
    return [{}, ProcessStatus.FINISHED];
  }

  next(result = null) {
    return null;
  }
}

class ParameterizedNode extends Node {
  static get rules() {
    const parameters_rules = {
      "parameters_has_input": [obju.hasField, "input"],
      "input_has_valid_type": [obju.isFieldOfType, "input", "object"]
    };
    return {
      ...super.rules,
      "has_parameters": [obju.hasField, "parameters"],
      "parameters_has_valid_type": [obju.isFieldTypeIn, "parameters", ["object"]],
      "parameters_input_validations": [new Validator(parameters_rules), "parameters"],
    };
  }

  validate() {
    return ParameterizedNode.validate(this._spec);
  }

  _preProcessing({ bag, input, actor_data, environment }) {
    return prepare(this._spec.parameters.input, { bag: bag, result: input, actor_data: actor_data, environment: environment });
  };
}

class FlowNode extends ParameterizedNode {
  static get rules() {
    const input_rules = {
      "input_has_one_key": [obju.hasManyKeys, "1"]
    };
    const next_rules = {
      "next_has_default": [obju.hasField, "default"]
    };
    return {
      ...super.rules,
      "next_has_valid_type": [obju.isFieldOfType, "next", "object"],
      "next_nested_validations": [new Validator(next_rules), "next"],
      "input_nested_validations": [new Validator(input_rules), "parameters.input"]
    };
  }

  validate() {
    return FlowNode.validate(this._spec);
  }

  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {} }, lisp) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment });
      return {
        node_id: this.id,
        bag: bag,
        external_input: external_input,
        result: input,
        error: null,
        status: ProcessStatus.RUNNING,
        next_node_id: this.next(execution_data)
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }

  next(execution_data) {
    const decision_key = Object.keys(this._spec.parameters.input)[0];
    const next_obj = this._spec.next;
    const next_key = _.get(execution_data, decision_key);
    if (_.has(next_obj, next_key)) {
      return this._spec.next[next_key];
    }
    return this._spec.next.default;
  }
}

class UserTaskNode extends ParameterizedNode {
  static get rules() {
    const parameters_rules = {
      "parameters_has_action": [obju.hasField, "action"]
    };
    return {
      ...super.rules,
      "next_has_valid_type": [obju.isFieldTypeIn, "next", ["string", "number"]],
      "parameters_nested_validations": [new Validator(parameters_rules), "parameters"],
    };
  }

  validate() {
    return UserTaskNode.validate(this._spec);
  }

  async run({ bag, input, external_input = null, actor_data, environment = {} }, lisp) {
    try {
      if (!external_input) {
        const execution_data = this._preProcessing({ bag, input, actor_data, environment });

        const activity_manager = getActivityManager(this._spec.parameters.activity_manager);
        activity_manager.props = {
          result: execution_data,
          action: this._spec.parameters.action,
        }
        activity_manager.parameters = {};
        let next_node_id = this.id;
        let status = ProcessStatus.WAITING;
        if (activity_manager.type === "notify") {
          next_node_id = this.next();
          status = ProcessStatus.RUNNING;
        }

        return {
          node_id: this.id,
          bag: bag,
          external_input: external_input,
          result: execution_data,
          error: null,
          status: status,
          next_node_id: next_node_id,
          activity_manager: activity_manager,
          action: this._spec.parameters.action,
        };
      }
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
    return await this._postRun(bag, input, external_input, lisp);
  }

  async _preRun(execution_data, lisp) {
    return [execution_data, ProcessStatus.WAITING];
  }

  async _postRun(bag, input, external_input, lisp) {
    return {
      node_id: this.id,
      bag: bag,
      external_input: external_input,
      result: external_input,
      error: null,
      status: ProcessStatus.RUNNING,
      next_node_id: this.next(external_input)
    }
  }
}

class ScriptTaskNode extends ParameterizedNode {
  static get rules() {
    const parameters_rules = {
      "parameters_has_script": [obju.hasField, "script"],
      "parameters_script_has_valid_type": [obju.isFieldOfType, "script", "object"],
    };
    const script_rules = {
      "script_has_function": [obju.hasField, "function"],
      "script_args_has_valid_type": [obju.isFieldTypeIn, "args", ["undefined", "object"]],
    };
    return {
      ...super.rules,
      "next_has_valid_type": [obju.isFieldTypeIn, "next", ["string", "number"]],
      "parameters_nested_validations": [new Validator(parameters_rules), "parameters"],
      "script_nested_validations": [new Validator(script_rules), "parameters.script"],
    };
  }

  validate() {
    return ScriptTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    let result;
    try {
      const parameters = this._spec.parameters;
      let lisp_fn;
      if (parameters.script.type === "js") {
        lisp_fn = writeJsFunction(parameters.script.function);
      } else {
        lisp_fn = parameters.script.function;
      }
      const lisp_args = parameters.script.args || [];
      const all_args = [execution_data, ...lisp_args];
      result = lisp.evaluate([lisp_fn, ...all_args]);
    } catch (err) {
      throw new Error("Couldn't execute scripted function: " + err);
    }
    return [result, ProcessStatus.RUNNING];
  }
}

class SystemTaskNode extends ParameterizedNode {
  static get rules() {
    return {
      ...super.rules,
      "next_has_valid_type": [obju.isFieldTypeIn, "next", ["string", "number"]]
    };
  }

  validate() {
    return SystemTaskNode.validate(this._spec);
  }

  _run(execution_data, lisp) {
    return [execution_data, ProcessStatus.RUNNING];
  }
}

class SetToBagSystemTaskNode extends SystemTaskNode {
  async run({ bag = {}, input = {}, external_input = {}, actor_data = {}, environment = {} }, lisp) {
    try {
      const execution_data = this._preProcessing({ bag, input, actor_data, environment });
      return {
        node_id: this.id,
        bag: { ...bag, ...execution_data },
        external_input: external_input,
        result: input,
        error: null,
        status: ProcessStatus.RUNNING,
        next_node_id: this.next(),
      };
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }
  }
}

class HttpSystemTaskNode extends SystemTaskNode {
  static get rules() {
    const parameters_rules = {
      "parameters_has_request": [obju.hasField, "request"],
      "parameters_request_has_valid_type": [obju.isFieldOfType, "request", "object"],
    };
    const request_rules = {
      "request_has_url": [obju.hasField, "url"],
      "request_has_verb": [obju.hasField, "verb"],
      "request_header_has_valid_type": [obju.isFieldTypeIn, "header", ["undefined", "object"]],
    };
    return {
      ...super.rules,
      "parameters_nested_validations": [new Validator(parameters_rules), "parameters"],
      "request_nested_validations": [new Validator(request_rules), "parameters.request"],
    };
  }

  validate() {
    return HttpSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    const { verb, url: endpoint, headers } = this.request;
    let result;
    try {
      result = await request[verb](endpoint, execution_data, headers);
    } catch (err) {
      result = {
        status: err.response.status,
        data: err.response.data,
      };
    }
    return [result, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input, actor_data, environment }) {
    this.request = prepare(this._spec.parameters.request, { bag, result: input, actor_data, environment });
    return super._preProcessing({ bag, input, actor_data, environment });
  }
}

class TimerSystemTaskNode extends SystemTaskNode {
  static get rules() {
    const parameters_rules = {
      "parameters_has_timeout": [obju.hasField, "timeout"],
      "parameters_timeout_has_valid_type": [obju.isFieldOfType, "timeout", "number"]
    };

    return {
      ...super.rules,
      "parameters_nested_validations": [new Validator(parameters_rules), "parameters"],
    };
  }

  validate() {
    return TimerSystemTaskNode.validate(this._spec);
  }

  async _run(execution_data, lisp) {
    const parameters = this._spec.parameters;
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, parameters.timeout * 1000);
    })
    return [execution_data, ProcessStatus.RUNNING];
  }
}

module.exports = {
  Node: Node,
  StartNode: StartNode,
  FinishNode: FinishNode,

  FlowNode: FlowNode,

  UserTaskNode: UserTaskNode,

  ScriptTaskNode: ScriptTaskNode,

  SystemTaskNode: SystemTaskNode,
  SetToBagSystemTaskNode: SetToBagSystemTaskNode,
  HttpSystemTaskNode: HttpSystemTaskNode,
  TimerSystemTaskNode: TimerSystemTaskNode
};
