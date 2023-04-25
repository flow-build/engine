let process_state_notifier = null;
function getProcessStateNotifier() {
  return process_state_notifier;
}

function setProcessStateNotifier(notifier) {
  process_state_notifier = notifier;
}

let activity_manager_notifier = null;
function getActivityManagerNotifier() {
  return activity_manager_notifier;
}

function setActivityManagerNotifier(notifier) {
  activity_manager_notifier = notifier;
}

let node_event_notifier = null;
function getEventNodeNotifier() {
  return node_event_notifier;
}

function setEventNodeNotifier(notifier) {
  node_event_notifier = notifier;
}

module.exports = {
  getProcessStateNotifier: getProcessStateNotifier,
  setProcessStateNotifier: setProcessStateNotifier,
  getActivityManagerNotifier: getActivityManagerNotifier,
  setActivityManagerNotifier: setActivityManagerNotifier,
  getEventNodeNotifier: getEventNodeNotifier,
  setEventNodeNotifier: setEventNodeNotifier
};
