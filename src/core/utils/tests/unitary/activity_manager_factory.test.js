const activity_manager_factory = require("../../activity_manager_factory");
const activity_managers = require("../../../workflow/activity_manager");

describe("activity_manager_factory", () => {
    describe("getActivityManager", () => {
        it("Without a type it should return the ActivityManager", () => {
            const activity_manager = activity_manager_factory.getActivityManager();

            expect(activity_manager).toBeInstanceOf(activity_managers.ActivityManager);
        })

        it("With type 'notify' it should return the NotifyActivityManager", () => {
            const activity_manager = activity_manager_factory.getActivityManager("notify");

            expect(activity_manager).toBeInstanceOf(activity_managers.NotifyActivityManager);
        })

        it("With type 'commit' it should return the NotifyActivityManager", () => {
            const activity_manager = activity_manager_factory.getActivityManager("commit");

            expect(activity_manager).toBeInstanceOf(activity_managers.ActivityManager);
        })
    })
});
