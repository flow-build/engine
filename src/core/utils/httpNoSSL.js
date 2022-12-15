module.exports = {
  httpNoSSLRun: async (executionData) => {
    const axios = require('axios').default;
    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false })
    axios.defaults.httpsAgent = httpsAgent
    
    const { verb, url, headers } = this.request;
    const result = await axios({
        method: verb,
        data: executionData,
        url: url,
        headers: headers,
    });

    return result;
  }
}