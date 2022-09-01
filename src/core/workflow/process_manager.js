const processDependency = require("./process");
const { ProcessStatus } = require("./process_state");
const workflowDependency = require("./workflow");

async function abortProcess(processIds) {
  const abort_promises = processIds.map(async (id) => {
    const process = await processDependency.Process.fetch(id);
    if (process) {
      const response = process.abort();
      if (process.state.bag.parent_process_data) {
        notifyParentProcess(process.id, process.state.bag.parent_process_data, ProcessStatus.INTERRUPTED);
      }
      return response;
    } else {
      throw new Error(`Process not found ${id}`);
    }
  });
  return Promise.allSettled(abort_promises);
}

async function continueProcess(process_id, result_data, expected_step_number) {
  const process = await processDependency.Process.fetch(process_id);
  const next_step_number = processDependency.Process.calculateNextStep(process.state.step_number);
  if (process && next_step_number === expected_step_number) {
    return await process.continue(result_data, process.state.actor_data);
  } else {
    return undefined;
  }
}

async function createProcessByWorkflowName(workflow_name, actor_data, initial_bag = {}) {
  const workflow = await workflowDependency.Workflow.fetchWorkflowByName(workflow_name);
  if (workflow) {
    return await workflow.createProcess(actor_data, initial_bag);
  }
  return undefined;
}

async function notifyCompletedActivityManager(process_id, { actor_data, activities }, expected_step_number) {
  const process = await processDependency.Process.fetch(process_id);
  const next_step_number = processDependency.Process.calculateNextStep(process.state.step_number);
  let result;
  if (process) {
    let process_promise;
    if (next_step_number === expected_step_number) {
      process_promise = process.run(actor_data, { activities: activities });
    } else {
      process_promise = Promise.resolve(process);
    }
    result = {
      process_promise,
    };
  }
  return result;
}

function notifyParentProcess(processId, parentData, status) {
  emitter.emit(
    "PROCESS.SUBPROCESS.UPSTREAM",
    `      SUBPROCESS UPSTREAM ON PID [${processId}] PPID [${parentData.id}]`,
    {
      process_id: processId,
      parent_process_id: parentData.id,
    }
  );
  continueProcess(
    parentData.id,
    { data: {}, status, sub_process_id: processId },
    processDependency.Process.calculateNextStep(parentData.expected_step_number)
  );
}

async function runProcess(process_id, actor_data, external_input) {
  const process = await processDependency.Process.fetch(process_id);
  if (process) {
    return await process.run(actor_data, external_input);
  }
  return undefined;
}

module.exports = {
  abortProcess,
  continueProcess,
  createProcessByWorkflowName,
  notifyCompletedActivityManager,
  notifyParentProcess,
  runProcess,
};
