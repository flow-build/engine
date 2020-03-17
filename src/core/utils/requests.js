const Axios = require('axios');
const axios = Axios.create();

module.exports = {
  request: {
    POST: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.post(endpoint, payload, request_headers);
      return {status: result.status, data: result.data};
    },
    GET: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.get(endpoint, request_headers);
      return {status: result.status, data: result.data};
    },
    DELETE: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.delete(endpoint, request_headers);
      return {status: result.status, data: result.data};
    },
    PATCH: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.patch(endpoint, payload, request_headers);
      return {status: result.status, data: result.data};
    },
    PUT: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.put(endpoint, payload, request_headers);
      return {status: result.status, data: result.data};
    },
    HEAD: async (endpoint, payload, headers) => {
      const request_headers = {headers: headers};
      const result = await axios.head(endpoint, request_headers);
      return {status: result.status, data: result.data};
    },
  }
}
