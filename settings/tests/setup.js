// Setup file for Jest if needed

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
};
