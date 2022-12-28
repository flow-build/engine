const { HttpSystemTaskNode } = require("./http");
const { ProcessStatus } = require("../process_state");
const { httpNoSSLRun } = require("../../utils/httpNoSSL");

class HttpNoSSLSystemTaskNode extends HttpSystemTaskNode {
  async _run(execution_data) {
    const result = await httpNoSSLRun(execution_data, this.request);
    return [{ status: result.status, data: result.data }, ProcessStatus.RUNNING];
  }
}

module.exports = {
  HttpNoSSLSystemTaskNode,
};