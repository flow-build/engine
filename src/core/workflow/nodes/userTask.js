const _ = require("lodash");
const { ProcessStatus } = require("../process_state");
const { getActivityManager } = require("../../utils/activity_manager_factory");
const crypto_manager = require("../../crypto_manager");
const { timeoutParse } = require("../../utils/node");
const { ParameterizedNode } = require("./parameterized");
const { prepare } = require("../../utils/input");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const eventSchema = {
  type: "object",
  required: ["family", "category"],
  properties: {
    definition: { oneOf: [{ type: "string" }, { type: "object" }] },
    family: { type: "string", enum: ["trigger", "target"] },
    category: {
      type: "string",
      enum: [
        "message",
        "timer",
        "error",
        "escalation",
        "cancel",
        "compensation",
        "conditional",
        "link",
        "signal",
        "terminate",
        "multiple",
        "parallel",
      ],
    },
    input: { type: "object" },
    key: { oneOf: [{ type: "string" }, { type: "object" }] },
    code: { oneOf: [{ type: "string" }, { type: "object" }] },
    rule: { oneOf: [{ type: "string" }, { type: "object" }] },
    dueDate: { oneOf: [{ type: "string", format: "date-time" }, { type: "object" }] },
    cycle: { oneOf: [{ type: "string" }, { type: "object" }] },
    duration: { oneOf: [{ type: "string" }, { type: "object" }] },
    nodes: { type: "array" },
  },
};

class UserTaskNode extends ParameterizedNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["action", "input"],
          properties: {
            action: { type: "string" },
            input: { type: "object" },
            timeout: {
              oneOf: [{ type: "number" }, { type: "object" }],
            },
            channels: { type: "array" },
            encrypted_data: {
              type: "array",
              items: { type: "string" },
            },
            activity_schema: { type: "object" },
            activity_manager: { type: "string", enum: ["commit", "notify"] },
          },
        },
        events: { type: "array", items: eventSchema },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(UserTaskNode.schema);
    const validation = validate(spec);
    if (validation && spec.parameters.activity_schema) {
      const activitySchemaValidation = ajv.validateSchema(spec.parameters.activity_schema);
      if (ajv.errors) {
        return [activitySchemaValidation, JSON.stringify([{ message: "invalid activity_schema" }])];
      }
      return [activitySchemaValidation, "null"];
    }
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return UserTaskNode.validate(this._spec);
  }

  async run({ bag, input, external_input = null, actor_data, environment = {}, parameters = {} }, lisp) {
    try {
      if (!external_input) {
        const execution_data = this._preProcessing({ bag, input, actor_data, environment, parameters });
        //if events are provided, prepare each event
        let preparedEvents;
        if (this._spec.events) {
          preparedEvents = this._spec.events.map((item) =>
            prepare(item, {
              bag,
              result: input,
              actor_data,
              environment,
              parameters,
            })
          );
        }

        const activity_manager = getActivityManager(this._spec.parameters.activity_manager);
        activity_manager.props = {
          result: execution_data,
          action: this._spec.parameters.action,
        };
        activity_manager.parameters = {};
        activity_manager.parameters.events = preparedEvents;
        activity_manager.parameters.timeout = timeoutParse(this._spec.parameters, execution_data);

        if (this._spec.parameters.channels) {
          activity_manager.parameters.channels = this._spec.parameters.channels;
        }
        if (this._spec.parameters.encrypted_data) {
          activity_manager.parameters.encrypted_data = this._spec.parameters.encrypted_data;
        }
        if (this._spec.parameters.activity_schema) {
          activity_manager.parameters.activity_schema = this._spec.parameters.activity_schema;
        }
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
          activity_schema: this._spec.parameters.activity_schema,
        };
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
    const node_extract = this._spec?.extract;
    return await this._postRun(bag, input, external_input, lisp, parameters?._extract, node_extract);
  }

  async _preRun(execution_data) {
    return [execution_data, ProcessStatus.WAITING];
  }

  async _postRun(bag, input, external_input, lisp, _extract = false, node_extract = "") {
    return {
      node_id: this.id,
      bag: this._setBag(bag, external_input, _extract, node_extract),
      external_input: external_input,
      result: external_input,
      error: null,
      status: ProcessStatus.RUNNING,
      next_node_id: this.next(external_input),
    };
  }
}

module.exports = {
  UserTaskNode,
};
