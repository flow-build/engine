const { v1: uuid } = require("uuid");

const process_state_id = uuid();
const id = uuid();

const serialized = {
  id,
  created_at: new Date(),
  type: "commit",
  process_state_id,
  status: "any",
  props: {
    foo: "bar",
  },
  parameters: {
    hello: "world",
  },
};

const activity_manager = {
  _id: id,
  _created_at: new Date(),
  _type: "commit",
  process_state_id: process_state_id,
  _status: "any",
  _props: {
    foo: "bar",
  },
  _parameters: {
    hello: "world",
  },
};

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
        dueDate: new Date(new Date().getTime() + 10000),
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
        dueDate: new Date(new Date().getTime() + 10000),
      },
    ],
  },
};

module.exports = {
  serialized,
  activity_manager,
  process_state_id,
  minimal,
  withTimeout,
  withSingleDueDateTimerEvent,
  withSingleDurationTimerEvent,
  withMultipleTimers,
};
