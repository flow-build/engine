const _ = require("lodash");
const Ajv = require("ajv");
const crypto = require("crypto");
const addFormats = require("ajv-formats");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { request } = require("../../utils/requests");
const { SystemTaskNode } = require("./systemTask");
const emitter = require("../../utils/emitter");

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
                retry: {
                  type: "object",
                  required: ["attempts", "interval", "conditions"],
                  properties: {
                    attempts: {type: "integer"},
                    interval: {type: "integer"},
                    conditions: {
                      type: "array",
                      items: {
                        type: ["integer","string"]
                      } 
                    }
                  }
                }
              },
            },
            valid_response_codes: {
              type: "array",
              items: { 
                type:  ["integer","string"] 
              },
            },
          },
        },
      },
    });
  }

  static validate(spec) {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const validate = ajv.compile(HttpSystemTaskNode.schema);
    const validation = validate(spec);
    return [validation, JSON.stringify(validate.errors)];
  }

  static includesHTTPCode(code_array, answer_code) {
    const target_codes = code_array.map(code => code.toString());
    const input_code = answer_code.toString();

    const re = /[1-5][X0-9][X0-9]/;
    const codeMatch = (code) => {
      if(code.match(re)) {
        const first_char = code[0];
        const second_char = code[1] === 'X' ? '[0-9]': code[1];
        const third_char = code[2] === 'X' ? '[0-9]': code[2];
        const code_re = new RegExp(`${first_char}${second_char}${third_char}`);
        return input_code.match(code_re);
      }
      return code === input_code;
    }

    return target_codes.find(code => codeMatch(code)) || null;
  }

  next(result) {
    const retry_conditions = this._spec.parameters.request.retry?.conditions || [];
    const retry_attempts = this._spec.parameters.request.retry?.attempts || 0;
    if(HttpSystemTaskNode.includesHTTPCode(retry_conditions, result.status) && result.attempt < retry_attempts) {
      return this._spec["id"];
    }
    return this._spec["next"];
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

    const request_id = crypto.randomBytes(16).toString("hex");
    const process_id = execution_data.process_id;
    const request_attempt = execution_data.HTTP_REQUEST_ATTEMPT || 0;
    const payload = execution_data.payload;

    emitter.emit("HTTP.NODE.REQUEST", {
      verb,
      endpoint,
      payload,
      headers,
      configs: {
        http_timeout,
        max_content_length
      }
    }, { request_id: request_id, process_id: process_id })

    let result;
    try {
      result = await request[verb](endpoint, payload, headers, { http_timeout, max_content_length });
    } catch (err) {
      if (err.response || err.code === 'ECONNABORTED') {
        result = {
          status: err.response?.status || err.code,
          data: err.response?.data === undefined ? {} : err.response?.data,
          attempt: request_attempt + 1,
          timeout: this._spec.parameters.request.retry?.interval,
        };
      } else {
        throw new Error(`Got no response from request to ${verb} ${endpoint}, ${err.message}`);
      }
    }
    const HTTP_WARN_CODES = process.env.HTTP_WARN_CODES;
    if(HTTP_WARN_CODES) {
      try {
        const parsedWarnCodes = JSON.parse(HTTP_WARN_CODES);
        if(HttpSystemTaskNode.includesHTTPCode(parsedWarnCodes, result.status)) {
          emitter.emit("HTTP.NODE.WARN", result, { level: 'warn', request_id, process_id, endpoint });
        }
      } catch(e) {}
    }
    if (this._spec.parameters.valid_response_codes) {
      if(!HttpSystemTaskNode.includesHTTPCode(this._spec.parameters.valid_response_codes, result.status)) {
        emitter.emit("HTTP.NODE.RESPONSE", result, { level: 'error', request_id: request_id, process_id: process_id });
        throw new Error(`Invalid response status: ${result.status}`);
      }
    }
    emitter.emit("HTTP.NODE.RESPONSE", result, { request_id: request_id, process_id: process_id });
    
    const retry_conditions = this._spec.parameters.request.retry?.conditions || [];
    const retry_attempts = this._spec.parameters.request.retry?.attempts || 0;
    if(HttpSystemTaskNode.includesHTTPCode(retry_conditions, result.status) && result.attempt < retry_attempts) {
      return [result, ProcessStatus.PENDING];  
    }
    
    return [result, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    this.request = prepare(this._spec.parameters.request, { bag, result: input, actor_data, environment, parameters });
    const pre_processed = super._preProcessing({ bag, input, actor_data, environment, parameters });
    return { process_id: parameters?.process_id || "unknown", HTTP_REQUEST_ATTEMPT: input.attempt || 0, payload: pre_processed };
  }
}

module.exports = {
  HttpSystemTaskNode,
};
