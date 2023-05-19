require("dotenv").config();
const { SSMClient, GetParametersCommand, GetParameterCommand,
  PutParameterCommand, DeleteParameterCommand } = require("@aws-sdk/client-ssm");

const client = new SSMClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function putParameter(name, value, type) {
  try {
    const input = {
      Name: name,
      Value: String(value),
      Type: type,
      Overwrite: true,
    }

    const command = new PutParameterCommand(input);
    const response = await client.send(command);
    return response["$metadata"];
  } catch (error) {
    return error;
  }
};

async function getParameters(names) {
  try {
    const input = {
      Names: names,
      WithDecryption: false,
    }

    const command = new GetParametersCommand(input);
    const response = await client.send(command);
    return response.Parameters;
  } catch (error) {
    return [];
  }
};

async function getParameter(name) {
  try {
    const input = {
      Name: name,
      WithDecryption: false,
    }

    const command = new GetParameterCommand(input);
    const response = await client.send(command);
    return response.Parameter;
  } catch (error) {
    return undefined;
  }
};

async function deleteParameter(name) {
  try {
    const input = {
      Name: name,
    }

    const command = new DeleteParameterCommand(input);
    const response = await client.send(command);
    return response["$metadata"];
  } catch (error) {
    return error;
  }
};

module.exports = {
  getParameters,
  getParameter,
  putParameter,
  deleteParameter,
};