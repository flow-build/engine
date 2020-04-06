const processDependency = require("./process");
const workflowDependency = require("./workflow");

module.exports.createProcessByWorkflowName = async function (workflow_name, actor_data, initial_bag = {}) {
    const workflow = await workflowDependency.Workflow.fetchWorkflowByName(workflow_name);
    if (workflow) {
        return await workflow.createProcess(actor_data, initial_bag);
    }
    return undefined;
}

module.exports.runProcess = async function (process_id, actor_data, external_input) {
    const process = await processDependency.Process.fetch(process_id);
    if (process) {
        return await process.run(actor_data, external_input);
    }
    return undefined;
}

module.exports.continueProcess = async function (process_id, result_data) {
    const process = await processDependency.Process.fetch(process_id);
    if (process) {
        return await process.continue(result_data);
    } else {
        return undefined;
    }
}