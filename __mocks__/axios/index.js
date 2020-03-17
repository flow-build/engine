const defaultMock = {
  get: (endpoint, headers) => {
    expect(endpoint).toBe("https://koa-app:3000/test_api");
    return {status: 200, data: {"response": "get_success"}};
  },
  post: (endpoint, payload, headers) => {
    expect(endpoint).toBe("https://koa-app:3000/test_api");
    expect(payload).toStrictEqual({"payload": {"dummy": "payload"}});
    return {status: 201, data: {"response": "post_success"}};
  },
  delete: (endpoint, headers) => {
    expect(endpoint).toBe("https://koa-app:3000/test_api");
    return {status: 204, data: {"response": "delete_success"}};
  }
};

const currentMock = {...defaultMock}

module.exports = {
  create: () => {
    return currentMock
  },
  __customResponse(verb, method) {
    currentMock[verb] = method;
  },
  __clearCustomResponse(verb) {
    currentMock[verb] = defaultMock[verb];
  },
}
