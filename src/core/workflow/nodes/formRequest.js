const { ProcessStatus } = require("../process_state");
const { prepare } = require("../../utils/input");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { request } = require("./utils/formRequest");
const emitter = require("../../utils/emitter");
const { SystemTaskNode } = require("./systemTask");

class FormRequestNode extends SystemTaskNode {
  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(FormRequestNode.schema());
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  static schema() {
    return {
      type: "object",
      required: ["id", "name", "next", "type", "lane_id", "parameters"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        next: { type: "string" },
        type: { type: "string" },
        lane_id: { type: "string" },
        category: { type: "string" },
        parameters: {
          type: "object",
          properties: {
            input: { type: "object" },
            request: {
              type: "object",
              required: ["url", "verb"],
              properties: {
                url: { oneOf: [{ type: "string" }, { type: "object" }] },
                verb: { type: "string", enum: ["POST", "PUT"] },
                headers: { type: "object" },
                maxContentLength: {
                  oneOf: [{ type: "number" }, { type: "object" }],
                },
                timeout: {
                  oneOf: [{ type: "number" }, { type: "object" }],
                },
              },
            },
            valid_response_codes: {
              type: "array",
              items: { type: "integer" },
            },
          },
          required: ["input", "request"],
        },
      },
    };
  }

  validate() {
    return FormRequestNode.validate(this._spec);
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    this.request = prepare(this._spec.parameters.request, { bag, result: input, actor_data, environment, parameters });
    return super._preProcessing({ bag, input, actor_data, environment, parameters });
  }

  async _run(executionData) {
    const { verb, url, headers } = this.request;
    const config = {
      timeout: this.request.timeout,
      maxContentLength: this.request.maxContentLength,
    };
    let result = {};
    try {
      result = await request[verb](url, executionData, headers, config);
      if (this._spec.parameters.valid_response_codes) {
        if (!this._spec.parameters.valid_response_codes.includes(result.status)) {
          emitter.emit(
            "NODE.ERROR",
            `ERROR AT NID [${this.id}] | FORMREQUEST | Invalid response status: ${result.status}`,
            {
              node_id: this.id,
              status: result.status,
              data: result.data,
              error: "invalid response code",
            }
          );
          return [{ ...result, ...{ error: "invalid response code" } }, ProcessStatus.ERROR];
        }
      }
    } catch (err) {
      if (err.code === "ECONNREFUSED") {
        emitter.emit(
          "NODE.ERROR",
          `ERROR AT NID [${this.id}] | FORMREQUEST | Got no response from request to ${verb} ${url}, ${err.message}`,
          {
            node_id: this.id,
            error: err,
          }
        );
        result = {
          status: err.code,
          data: `address: ${err.address}, port: ${err.port}`,
        };
      } else {
        emitter.emit("NODE.ERROR", `ERROR AT NID [${this.id}] | FORMREQUEST | unexpected error`, {
          node_id: this.id,
          error: err,
        });
        throw new Error(err);
      }
    }

    return [result, ProcessStatus.RUNNING];
  }
}

module.exports = {
  FormRequestNode,
};
