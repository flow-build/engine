const _ = require("lodash");
const obju = require("../../utils/object");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const crypto_manager = require("../../crypto_manager");
const { ParameterizedNode } = require("./parameterized");

class SubProcessNode extends ParameterizedNode {
  static get rules() {
    const parameters_rules = {
      parameters_has_actor_data: [obju.hasField, "actor_data"],
      parameters_has_input: [obju.hasField, "input"],
      parameters_has_workflow_name: [obju.hasField, "workflow_name"],
      parameters_workflow_name_has_valid_type: [obju.isFieldTypeIn, "workflow_name", ["string", "object"]],
    };
    return {
      ...super.rules,
      next_has_valid_type: [obju.isFieldTypeIn, "next", ["string", "number"]],
      parameters_nested_validations: [new Validator(parameters_rules), "parameters"],
    };
  }

  validate() {
    return SubProcessNode.validate(this._spec);
  }

  async run({ bag, input, external_input = null, actor_data, environment = {}, parameters = {} }, lisp) {
    try {
      if (!external_input) {
        const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
        const prepared_actor_data = prepare(this._spec.parameters.actor_data, {
          bag,
          result: input,
          actor_data,
          environment,
          parameters,
        });

        return {
          node_id: this.id,
          bag: bag,
          external_input: external_input, //external_input is always null here
          result: execution_data,
          error: null,
          status: ProcessStatus.DELEGATED,
          next_node_id: this.id,
          workflow_name: this._spec.parameters.workflow_name,
          actor_data: prepared_actor_data,
        };
      } else {
        if (external_input.userInput === "") {
          return await this._postRun(bag, input, external_input, lisp);
        }
      }
    } catch (err) {
      return this._processError(err, { bag, external_input });
    }

    if (this._spec.parameters.encrypted_data) {
      const crypto = crypto_manager.getCrypto();

      for (const field_path of this._spec.parameters.encrypted_data) {
        const data = _.get(external_input, field_path);
        if (data) {
          const encrypted_data = crypto.encrypt(data);
          _.set(external_input, field_path, encrypted_data);
        }
      }
    }
    return await this._postRun(bag, input, external_input, lisp);
  }

  async _postRun(bag, input, external_input, lisp) {
    return {
      node_id: this.id,
      bag: bag,
      external_input: external_input,
      result: external_input,
      error: null,
      status: ProcessStatus.RUNNING,
    };
  }
}

module.exports = { SubProcessNode };
