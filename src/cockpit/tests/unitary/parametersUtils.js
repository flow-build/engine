const putParameterResponse = {
  "$metadata": {
    httpStatusCode: 200,
    requestId: "0c077ad3-94d1-4d05-aee0-89eeb4d34183",
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Tier: "Standard",
  Version: 1
};

const getParameterResponse = {
  "$metadata": {
    httpStatusCode: 200,
    requestId: "e42b49a6-5732-4a10-83e6-349f258d86f6",
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  Parameter: {
    ARN: "arn:aws:ssm:us-east-2:parameter/RESPONSE_CODES",
    DataType: "text",
    LastModifiedDate: "2023-05-19T18:05:20.039Z",
    Name: "RESPONSE_CODES",
    Type: "String",
    Value: "200,202,204",
    Version: 1
  }
};

const getParametersResponse = {
  "$metadata": {
    httpStatusCode: 200,
    requestId: "21c31333-9bac-4ff8-846b-a71999a5377a",
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  },
  InvalidParameters: [],
  Parameters: [
    {
      ARN: "arn:aws:ssm:us-east-2:parameter/API_HOST",
      DataType: "text",
      LastModifiedDate: "2023-05-19T18:05:20.039Z",
      Name: "API_HOST",
      Type: "String",
      Value: "http://localhost:3000",
      Version: 1
    },
    {
      ARN: "arn:aws:ssm:us-east-2:parameter/RESPONSE_CODES",
      DataType: "text",
      LastModifiedDate: "2023-05-18T17:05:20.039Z",
      Name: "RESPONSE_CODES",
      Type: "String",
      Value: "200,202,204",
      Version: 1
    }
  ]
};

const deleteParameterResponse = {
  "$metadata": {
    httpStatusCode: 200,
    requestId: "3703153a-46d1-4749-9e6c-eb5c9c23278e",
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0
  }
};

module.exports = {
  putParameterResponse,
  getParameterResponse,
  getParametersResponse,
  deleteParameterResponse,
};