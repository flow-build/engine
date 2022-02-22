const Axios = require("axios");
const axios = Axios.create();
const qs = require("qs");
const { setTraceparent } = require("../../../utils/requests");

module.exports = {
  request: {
    POST: async (endpoint, payload, headers, { timeout, maxContentLength }) => {
      const encodedPayload = qs.stringify(payload);
      const config = {
        headers: setTraceparent(headers),
        timeout,
        maxContentLength,
        validateStatus: function (status) {
          return status <= 599;
        },
      };
      const result = await axios.post(endpoint, encodedPayload, config);
      return { status: result.status, data: result.data };
    },
    PATCH: async (endpoint, payload, headers, { timeout, maxContentLength }) => {
      const encodedPayload = qs.stringify(payload);
      const config = {
        headers: setTraceparent(headers),
        timeout,
        maxContentLength,
        validateStatus: function (status) {
          return status <= 599;
        },
      };
      const result = await axios.patch(endpoint, encodedPayload, config);
      return { status: result.status, data: result.data };
    },
    PUT: async (endpoint, payload, headers, { timeout, maxContentLength }) => {
      const request_config = {
        headers: setTraceparent(headers),
        timeout,
        maxContentLength,
        validateStatus: function (status) {
          return status <= 599;
        },
      };
      const result = await axios.put(endpoint, payload, request_config);
      return { status: result.status, data: result.data };
    },
  },
};
