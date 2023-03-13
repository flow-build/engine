const { v1: uuid } = require("uuid");

const process_state_id = uuid();

const minimal = {
  process_state_id: process_state_id,
  props: {
    foo: "bar",
  },
  parameters: {
    any: "value",
  },
};

const withTimeout = {
  process_state_id: process_state_id,
  props: {
    action: "do anything before 30 seconds",
    result: {
      foo: "bar",
    },
  },
  parameters: {
    next_step_number: 10,
    timeout: 30,
  },
};

const withSingleDueDateTimerEvent = {
  process_state_id: process_state_id,
  props: {
    action: "do anything before 10 seconds",
    result: {
      foo: "bar",
    },
  },
  parameters: {
    next_step_number: 10,
    events: [
      {
        family: "target",
        category: "timer",
        dueDate: new Date(new Date().getTime() + 10000).toISOString(),
      },
    ],
  },
};

const withSingleDurationTimerEvent = {
  process_state_id: process_state_id,
  props: {
    action: "do anything before 5 minutes and 30 seconds",
    result: {
      action: "do anything before 10 seconds",
      result: {
        foo: "bar",
      },
    },
  },
  parameters: {
    events: [
      {
        family: "target",
        category: "timer",
        duration: "PT5M30S",
      },
    ],
  },
};

const withMultipleTimers = {
  process_state_id: process_state_id,
  props: {
    action: "do anything before 5 minutes and 30 seconds",
    result: {
      action: "do anything before 10 seconds",
      result: {
        foo: "bar",
      },
    },
  },
  parameters: {
    events: [
      {
        family: "target",
        category: "timer",
        duration: "PT5M30S",
      },
      {
        family: "target",
        category: "timer",
        dueDate: new Date(new Date().getTime() + 10000).toISOString(),
      },
    ],
  },
};

module.exports = {
  process_state_id,
  minimal,
  withTimeout,
  withSingleDueDateTimerEvent,
  withSingleDurationTimerEvent,
  withMultipleTimers,
};
