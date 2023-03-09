const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const crypto_manager = require("../../crypto_manager");
const { ParameterizedNode } = require("./parameterized");
const process_manager = require("../process_manager");
const emitter = require("../../utils/emitter");

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

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    const context = {
      bag,
      result: input,
      actor_data,
      environment,
      parameters,
    };

    const prepared_input = super._preProcessing({
      bag,
      input,
      actor_data,
      environment,
      parameters,
    });
    const prepared_workflow_name = prepare(this._spec.parameters.workflow_name, context);
    const prepared_actor_data = prepare(this._spec.parameters.actor_data, context);

    return {
      workflow_name: prepared_workflow_name,
      input: prepared_input,
      actor_data: prepared_actor_data,
    };
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

        const initial_bag = {
          parent_process_data: {
            id: parameters.process_id,
            expected_step_number: input.step_number + 1,
          }
        }

        const child_process = await process_manager.createProcessByWorkflowName(
          execution_data.workflow_name,
          execution_data.actor_data,
          initial_bag
        );

        let result, status;
        if (child_process?.id) {
          emitter.emit(
            "PROCESS.SUBPROCESS",
            `      NEW SUBPROCESS ON PID [${parameters.process_id}] SPID [${child_process?.id}]`,
            {
              process_id: parameters.process_id,
              sub_process_id: child_process.id,
            }
          );
          process_manager.runProcess(child_process.id, execution_data.actor_data);
          result = { sub_process_id: child_process.id };
          status = ProcessStatus.DELEGATED;
        } else {
          emitter.emit("NODE.RESULT_ERROR", `WORKFLOW NAME ${execution_data.workflow_name} NOT FOUND`, {});
          result = { sub_process_id: "", error: "workflow not found" };
          status = ProcessStatus.ERROR;
        }

        return {
          node_id: this.id,
          bag: bag,
          external_input: external_input, //external_input is always null here
          result: result,
          error: null,
          status: status,
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
