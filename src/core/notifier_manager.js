let process_state_notifier;
function getProcessStateNotifier() {
    return process_state_notifier;
}

function setProcessStateNotifier(notifier) {
    process_state_notifier = notifier;
}

let activity_manager_notifier;
function getActivityManagerNotifier() {
    return activity_manager_notifier;
}

function setActivityManagerNotifier(notifier) {
    activity_manager_notifier = notifier;
}

module.exports = {
    getProcessStateNotifier: getProcessStateNotifier,
    setProcessStateNotifier: setProcessStateNotifier,
    getActivityManagerNotifier: getActivityManagerNotifier,
    setActivityManagerNotifier: setActivityManagerNotifier
};
