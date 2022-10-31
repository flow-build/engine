const _ = require("lodash");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { request } = require("../../utils/requests");
const { SystemTaskNode } = require("./systemTask");

class HttpSystemTaskNode extends SystemTaskNode {
  static get schema() {
    return _.merge(super.schema, {
      type: "object",
      properties: {
        next: { type: "string" },
        parameters: {
          type: "object",
          required: ["request"],
          properties: {
            request: {
              type: "object",
              required: ["url", "verb"],
              properties: {
                url: {
                  oneOf: [{ type: "string" }, { type: "object" }],
                },
                verb: { type: "string", enum: ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD"] },
                header: { type: "object" },
              },
            },
            valid_response_codes: {
              type: "array",
              items: { type: ["integer","string"] },
            },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(HttpSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  validate() {
    return HttpSystemTaskNode.validate(this._spec);
  }

  _formatHttpTimeout(request_timeout) {
    let http_timeout = 0;
    const int_timeout = parseInt(request_timeout);
    if (isNaN(int_timeout)) {
      const env_http_timeout = parseInt(process.env.HTTP_TIMEOUT);
      if (!isNaN(env_http_timeout)) {
        http_timeout = env_http_timeout;
      }
    } else {
      http_timeout = int_timeout;
    }
    return http_timeout;
  }

  _formatMaxContentLength(request_max_content_length) {
    let max_content_length = 2000;
    const int_max_content_length = parseInt(request_max_content_length);
    if (isNaN(int_max_content_length)) {
      const env_max_content_length = parseInt(process.env.MAX_CONTENT_LENGTH);
      if (!isNaN(env_max_content_length)) {
        max_content_length = env_max_content_length;
      }
    } else {
      max_content_length = int_max_content_length;
    }
    return max_content_length;
  }

  async _run(execution_data) {
    const { verb, url: endpoint, headers } = this.request;
    const http_timeout = this._formatHttpTimeout(this.request.timeout);
    const max_content_length = this._formatMaxContentLength(this.request.max_content_length);
    let result;
    try {
      result = await request[verb](endpoint, execution_data, headers, { http_timeout, max_content_length });
    } catch (err) {
      if (err.response) {
        result = {
          status: err.response.status,
          data: err.response.data,
        };
      } else if(err.code === 'ECONNABORTED') {
        result = {
          status: err.code,
          data: {},
        };
      } else {
        throw new Error(`Got no response from request to ${verb} ${endpoint}, ${err.message}`);
      }
    }
    if (this._spec.parameters.valid_response_codes) {
      if (!this._spec.parameters.valid_response_codes.includes(result.status)) {
        throw new Error(`Invalid response status: ${result.status}`);
      }
    }
    return [result, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    this.request = prepare(this._spec.parameters.request, { bag, result: input, actor_data, environment, parameters });
    return super._preProcessing({ bag, input, actor_data, environment, parameters });
  }
}

module.exports = {
  HttpSystemTaskNode,
};
