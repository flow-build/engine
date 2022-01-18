/* eslint-disable indent */
const { abstractFactory } = require("./factory");
const activity_managers = require("../workflow/activity_manager");

const factory_map = {
  ActivityManager: {
    key: "ActivityManager",
    class: activity_managers.ActivityManager,
  },
  NotifyActivityManager: {
    key: "NotifyActivityManager",
    class: activity_managers.NotifyActivityManager,
  },
};

const factory = abstractFactory(
  Object.values(factory_map).reduce((accumulator, currentValue) => {
    accumulator[currentValue.key] = [currentValue.class];
    return accumulator;
  }, {})
);

function getActivityManager(activity_manager_type, ...args) {
  let factory_key;
  switch (activity_manager_type) {
    case "notify": {
      factory_key = factory_map.NotifyActivityManager.key;
      break;
    }
    case "commit": {
      factory_key = factory_map.ActivityManager.key;
      break;
    }
    default: {
      factory_key = factory_map.ActivityManager.key;
      break;
    }
  }
  return factory(factory_key, ...args);
}

module.exports.getActivityManager = getActivityManager;
