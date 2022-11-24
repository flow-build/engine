const obju = require("../../utils/object");
const { prepare } = require("../../utils/input");
const { ProcessStatus } = require("../process_state");
const { Validator } = require("../../validators");
const { request } = require("../../utils/requests");
const { SystemTaskNode } = require("./systemTask");
const emitter = require("../../utils/emitter");

class HttpSystemTaskNode extends SystemTaskNode {
  static get rules() {
    const parameters_rules = {
      parameters_has_request: [obju.hasField, "request"],
      parameters_request_has_valid_type: [obju.isFieldOfType, "request", "object"],
      parameters_valid_response_codes_has_valid_type: [
        (obj, field) => obj[field] === undefined || obj[field] instanceof Array,
        "valid_response_codes",
      ],
    };
    const request_rules = {
      request_has_url: [obju.hasField, "url"],
      request_has_verb: [obju.hasField, "verb"],
      request_header_has_valid_type: [obju.isFieldTypeIn, "header", ["undefined", "object"]],
    };
    return {
      ...super.rules,
      parameters_nested_validations: [new Validator(parameters_rules), "parameters"],
      request_nested_validations: [new Validator(request_rules), "parameters.request"],
    };
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
    delete execution_data.process_id;

    emitter.emit("HTTP.NODE.REQUEST", {
      verb,
      endpoint,
      payload: execution_data,
      headers,
      configs: {
        http_timeout,
        max_content_length
      }
    }, { request_id: request_id, process_id: process_id })

    let result;
    try {
      result = await request[verb](endpoint, execution_data, headers, { http_timeout, max_content_length });
    } catch (err) {
      if (err.response) {
        result = {
          status: err.response.status,
          data: err.response.data,
        };
      } else {
        throw new Error(`Got no response from request to ${verb} ${endpoint}, ${err.message}`);
      }
    }
    if (this._spec.parameters.valid_response_codes) {
      if (!this._spec.parameters.valid_response_codes.includes(result.status)) {
        emitter.emit("HTTP.NODE.RESPONSE", result, { error: true, request_id: request_id, process_id: process_id });
        throw new Error(`Invalid response status: ${result.status}`);
      }
    }
    emitter.emit("HTTP.NODE.RESPONSE", result, { error: false, request_id: request_id, process_id: process_id })
    return [result, ProcessStatus.RUNNING];
  }

  _preProcessing({ bag, input, actor_data, environment, parameters }) {
    this.request = prepare(this._spec.parameters.request, { bag, result: input, actor_data, environment, parameters });
    const pre_processed = super._preProcessing({ bag, input, actor_data, environment, parameters });
    return { process_id: parameters?.process_id || "unknown", ...pre_processed };
  }
}

module.exports = {
  HttpSystemTaskNode,
};
