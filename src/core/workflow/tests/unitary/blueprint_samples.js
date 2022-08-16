const abort_process_minimal = require("../examples/abortProcess");
const admin_identity_system_task = require("../examples/adminLaneSystemTask");
const admin_identity_user_task = require("../examples/adminLaneUserTask");
const create_process_minimal = require("../examples/createProcessMinimal");
const createProcessWithRestrictedInputSchema = require("../examples/createProcessWithInputSchema");
const custom_node = require("../examples/customNode");
const extra_nodes = require("../examples/customNodes");
const environment = require("../examples/environment");
const reference_environment = require("../examples/environmentReference");
const existent_environment_variable = require("../examples/existingEnvironmentVariable");
const identity_system_task = require("../examples/identitySystemTask");
const identity_user_task = require("../examples/identityUserTask");
const inexistent_environment_variable = require("../examples/inexistingEnvironmentVariable");
const lisp_prepare = require("../examples/lispPrepare");
const lisp_requirements = require("../examples/lispRequirements");
const lisp_requirements_prepare = require("../examples/lispRequirementsAndPrepare");
const minimal = require("../examples/minimal");
const missing_requirements = require("../examples/missingRequirements");
const multiple_finish = require("../examples/multipleFinish");
const multiple_starts = require("../examples/multipleStarts");
const notify_and_user_task = require("../examples/notifyAndCommitUserTask");
const notify_and_2_user_task = require("../examples/notifyAndDoubleUserTasks");
const notify_user_task = require("../examples/notifyUserTask");
const parameters = require("../examples/parameters");
const ref = require("../examples/ref");
const withRestrictedInputSchema = require("../examples/restrictedInputSchema");
const restricted_multilane_identity_user_task = require("../examples/restrictedMultilane");
const start_with_timeout = require("../examples/startNodeWithTimeout");
const start_with_data = require("../examples/startWithData");
const sub_process = require("../examples/subProcess");
const syntax_error = require("../examples/syntaxError");
const timer = require("../examples/timer");
const timer_long = require("../examples/timerLong");
const user_task_user_task = require("../examples/twoUserTasks");
const user_timeout_user = require("../examples/twoUserTasksWithTimeout");
const use_actor_data = require("../examples/useActorData");
const user_action_with_system_task = require("../examples/userTaskAndScript");
const user_encrypt = require("../examples/userTaskWithEncrypt");
const user_timeout = require("../examples/userTaskWithTimeout");
const user_timeout_one_hour = require("../examples/userTaskWithTimeoutLong");

const blueprints_ = {
  abort_process_minimal,
  admin_identity_system_task,
  admin_identity_user_task,
  create_process_minimal,
  createProcessWithRestrictedInputSchema,
  custom_node,
  environment,
  existent_environment_variable,
  extra_nodes,
  identity_system_task,
  identity_user_task,
  inexistent_environment_variable,
  lisp_prepare,
  lisp_requirements,
  lisp_requirements_prepare,
  minimal,
  missing_requirements,
  multiple_starts,
  multiple_finish,
  notify_user_task,
  notify_and_user_task,
  notify_and_2_user_task,
  parameters,
  ref,
  reference_environment,
  restricted_multilane_identity_user_task,
  start_with_data,
  syntax_error,
  use_actor_data,
  user_encrypt,
  user_task_user_task,
  user_timeout,
  user_timeout_user,
  user_action: identity_user_task,
  user_action_with_system_task,
  user_timeout_one_hour,
  withRestrictedInputSchema,
  timer,
  timer_long,
  sub_process,
  start_with_timeout,
};

const actors_ = {
  sys_admin: {
    actor_id: "1",
    claims: ["sys_admin", "admin", "simpleton"],
  },
  admin: {
    actor_id: "2",
    claims: ["admin", "simpleton"],
  },
  manager: {
    actor_id: "3",
    claims: ["manager", "simpleton"],
  },
  simpleton: {
    actor_id: "4",
    claims: ["simpleton"],
  },
};

module.exports = {
  blueprints_: blueprints_,
  actors_: actors_,
};
