const Axios = require('axios');
const axios = Axios.create();

module.exports = {
  request: {
    POST: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.post(endpoint, payload, request_config);
      return {status: result.status, data: result.data};
    },
    GET: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.get(endpoint, request_config);
      return {status: result.status, data: result.data};
    },
    DELETE: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.delete(endpoint, request_config);
      return {status: result.status, data: result.data};
    },
    PATCH: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.patch(endpoint, payload, request_config);
      return {status: result.status, data: result.data};
    },
    PUT: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.put(endpoint, payload, request_config);
      return {status: result.status, data: result.data};
    },
    HEAD: async (endpoint, payload, headers, { http_timeout, max_content_length }) => {
      const request_config = {
        headers: headers,
        timeout: http_timeout,
        maxContentLength: max_content_length,
      };
      const result = await axios.head(endpoint, request_config);
      return {status: result.status, data: result.data};
    },
  }
}
