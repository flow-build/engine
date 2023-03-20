const { toSeconds, parse } = require("iso8601-duration");
const { Timer } = require("../timer");

function serializeJobData(event, options = {}) {
  const mapJobId = {
    intermediateevent: `${event.resource.id}-${event.resource.stepNumber}`,
    workflow: `${event.resource.id}-${event.resource.nodeId}`,
  };

  return {
    name: event.definition,
    payload: {
      resourceId: event.resource.id,
      stepNumber: event.resource.stepNumber,
      nodeId: event.resource.nodeId,
      workflowName: event.resource.workflowName,
    },
    options: {
      jobId: mapJobId[event.definition] || event.resource.id,
      delay: options.delay,
      repeat: options.repeat,
      limit: options.limit,
    },
  };
}

async function timerResolver(event) {
  const calculateDelay = {
    dueDate: () => {
      return {
        timeout: new Date(event.dueDate).getTime() - new Date().getTime(),
        dueDate: event.dueDate,
      };
    },
    duration: () => {
      try {
        const timeout = toSeconds(parse(event.duration));
        const now = new Date();
        now.setSeconds(now.getSeconds() + timeout);
        return {
          timeout: timeout * 1000,
          dueDate: now,
        };
      } catch {
        return undefined;
      }
    },
  };

  const delay = event.dueDate ? calculateDelay["dueDate"]() : calculateDelay["duration"]();
  if (!delay) {
    return { errors: "unable to resolve timer delay" };
  }

  const timerResourceMap = {
    intermediateevent: "Process",
    usertask: "ActivityManager",
    process: "Process",
    workflow: "Workflow",
  };

  let myTimer = new Timer(timerResourceMap[event.resource.type], event.resource.id, new Date(delay.dueDate), {});
  await myTimer.save();

  const options = {
    delay: delay.timeout,
    repeat: undefined,
    limit: undefined,
  };

  const job = serializeJobData(event, options);
  const jobResult = await Timer.addJob({
    name: job.name,
    payload: { ...job.payload, ...{ timerId: myTimer._id } },
    options: job.options,
  });
  if (!jobResult) {
    return {
      data: {
        timerId: myTimer.id,
      },
      delay: delay.timeout / 1000,
    };
  }

  return jobResult;
}

module.exports = {
  timerResolver,
};
