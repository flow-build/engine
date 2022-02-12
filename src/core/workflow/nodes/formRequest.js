const { SystemTaskNode } = require("../nodes");
const { ProcessStatus } = require("../process_state");
const { prepare } = require("../../utils/input");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { request } = require("../../utils/formRequest");

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
              properties: {
                url: { oneOf: [{ type: "string" }, { type: "object" }] },
                verb: { type: "string", enum: ["POST", "PUT"] },
                headers: { type: "object" },
              },
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
    let result = {};

    try {
      const res = await request[verb](url, executionData, headers, {});

      if (typeof res.body === "object") {
        result = res.body;
      } else {
        result = JSON.parse(res.body);
      }
      result.status = res.statusCode;

      if (this._spec.parameters.valid_response_codes) {
        if (!this._spec.parameters.valid_response_codes.includes(result.status)) {
          console.log(`Invalid response status: ${result.status}`);
          throw new Error(`Invalid response status: ${result.status}, message: ${result.message}`);
        }
      }
      console.log(result);
      return [result, ProcessStatus.RUNNING];
    } catch (err) {
      if (err.response) {
        result = {
          status: err.response.status,
          data: err.response.data,
        };
        throw err;
      } else {
        console.log(`Got no response from request to ${verb} ${url}, ${err.message}`, err);
        throw err;
      }
    }
  }
}

module.exports = { FormRequestNode };
