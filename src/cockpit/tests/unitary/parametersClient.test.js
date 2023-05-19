require("dotenv").config()
const { putParameter, getParameter, getParameters, deleteParameter } = require("../../utils/parametersClient");
const { SSMClient, GetParametersCommand, GetParameterCommand,
PutParameterCommand, DeleteParameterCommand } = require("@aws-sdk/client-ssm");
const { mockClient } = require("aws-sdk-client-mock");
const { putParameterResponse, getParameterResponse, getParametersResponse,
  deleteParameterResponse } = require("./parametersUtils");

const ssmMock = mockClient(SSMClient);

describe("Parameters client tests", () => {
  beforeAll(() => {
    ssmMock.on(PutParameterCommand).resolves(putParameterResponse);
    ssmMock.on(GetParameterCommand).resolves(getParameterResponse);
    ssmMock.on(GetParametersCommand).resolves(getParametersResponse);
    ssmMock.on(DeleteParameterCommand).resolves(deleteParameterResponse);
  });

  test("putParameter of type String should work", async () => {
    const response = await putParameter("API_HOST", "http://localhost:3000", "String");
    expect(response.httpStatusCode).toBe(200);
  });

  test("putParameter of type StringList should work", async () => {
    const response = await putParameter("RESPONSE_CODES", "200,202,204", "StringList");
    expect(response.httpStatusCode).toBe(200);
  });

  test("getParameter should work", async () => {
    const response = await getParameter("API_HOST");

    expect(response.Name).toEqual("RESPONSE_CODES");
    expect(response.Value).toEqual("200,202,204");
  });

  test("getParameters should work", async () => {
    const response = await getParameters(["API_HOST", "DIAGRAMS_HOST"]);

    expect(response).toHaveLength(2);
    expect(response[0].Name).toEqual("API_HOST");
    expect(response[1].Name).toEqual("RESPONSE_CODES");
    expect(response[0].Value).toEqual("http://localhost:3000");
    expect(response[1].Value).toEqual("200,202,204");
  });

  test("deleteParameter should work", async () => {
    const response = await deleteParameter("DIAGRAMS_HOST");

    expect(response.httpStatusCode).toBe(200);
  });
});