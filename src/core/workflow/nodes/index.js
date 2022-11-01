const { Node } = require("./node");
const { AbortProcessSystemTaskNode } = require("./abortProcess");
const { FinishNode } = require("./finish");
const { FlowNode } = require("./flow");
const { HttpSystemTaskNode } = require("./http");
const { ScriptTaskNode } = require("./scriptTask");
const { SetToBagSystemTaskNode } = require("./setToBag");
const { StartNode } = require("./start");
const { StartProcessSystemTaskNode } = require("./startProcess");
const { SubProcessNode } = require("./subProcess");
const { SystemTaskNode } = require("./systemTask");
const { TimerSystemTaskNode } = require("./timer");
const { UserTaskNode } = require("./userTask");
const { FormRequestNode } = require("./formRequest");
const { TriggerFinishNode } = require("./triggerFinish")
const { TargetStartNode } = require("./targetStart")
const { SignalSystemTaskNode } = require("./signalSystemTask")

module.exports = {
  AbortProcessSystemTaskNode: AbortProcessSystemTaskNode,
  Node: Node,
  StartNode: StartNode,
  FinishNode: FinishNode,
  FormRequestNode: FormRequestNode,
  FlowNode: FlowNode,
  ScriptTaskNode: ScriptTaskNode,
  SystemTaskNode: SystemTaskNode,
  SetToBagSystemTaskNode: SetToBagSystemTaskNode,
  HttpSystemTaskNode: HttpSystemTaskNode,
  TimerSystemTaskNode: TimerSystemTaskNode,
  StartProcessSystemTaskNode: StartProcessSystemTaskNode,
  SubProcessNode: SubProcessNode,
  UserTaskNode: UserTaskNode,
  TriggerFinishNode: TriggerFinishNode,
  TargetStartNode: TargetStartNode,
  SignalSystemTaskNode: SignalSystemTaskNode
};
