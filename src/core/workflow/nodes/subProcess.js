const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const crypto_manager = require("../../crypto_manager");
const { ParameterizedNode } = require("./parameterized");

class SubProcessNode extends ParameterizedNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["actor_data", "input", "workflow_name"],
          properties: {
            actor_data: { type: "object" },
            input: { type: "object" },
            workflow_name: {
              oneOf: [{ type: "string" }, { type: "object" }],
            },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(SubProcessNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
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
    return await this._postRun(bag, external_input);
  }

  async _postRun(bag, external_input) {
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
