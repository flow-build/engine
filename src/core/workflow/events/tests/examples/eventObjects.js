const targetMinimal = {
  definition: "any definition",
  family: "target",
  category: "timer",
  input: {
    foo: "bar",
  },
  key: "any key",
  code: "any code",
  rule: "any rule",
  dueDate: new Date(new Date().getTime() + 1000).toISOString(),
  cycle: "any cron string",
  duration: "any ISO8601 pattern",
  nodes: [],
  resource: {
    id: "94164158-9653-425b-9b9a-6904711e6c0f",
    type: "intermediateevent",
    nodeId: "FOO",
    stepNumber: 1,
  },
};

const timer = {
  duration: {
    definition: "any definition",
    family: "target",
    category: "timer",
    input: {},
    duration: "PT10M10S",
    resource: {
      id: "94164158-9653-425b-9b9a-6904711e6c0f",
      type: "intermediateevent",
      nodeId: "FOO",
      stepNumber: 1,
    },
  },
  dueDate: {
    definition: "intermediateEvent",
    family: "target",
    category: "timer",
    input: {},
    dueDate: new Date(new Date().getTime() + 10000).toISOString(),
    resource: {
      id: "94164158-9653-425b-9b9a-6904711e6c0f",
      type: "intermediateevent",
      nodeId: "FOO",
      stepNumber: 1,
    },
  },
};

module.exports = {
  targetMinimal,
  timer,
};
