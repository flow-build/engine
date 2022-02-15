const _ = require("lodash");
const requests = require("../../requests");

describe("setTraceparent", () => {
  test("setTraceparent should set traceparent header", () => {
    const request = requests.setTraceparent();
    expect(request.traceparent).toBeDefined();
  });

  test("setTraceparent should not change an existing traceparent header", async () => {
    const headers = {
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    };
    const finalHeader = requests.setTraceparent(headers);
    expect(finalHeader).toEqual(headers);
  });
});
