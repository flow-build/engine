const { PersistedEntity } = require("./base");
const _ = require("lodash");


class Timer extends PersistedEntity {

    static getEntityClass() {
        return Timer;
    }

    static serialize(timer) {
        return {
            id: timer._id,
            created_at: timer._created_at,
            expires_at: timer._expires_at,
            active: timer._active,
            resource_type: timer._resource_type,
            resource_id: timer._resource_id,
            params: timer._params,
            fired_at: timer._fired_at
        };
    }

    static deserialize(serialized) {
        if (serialized) {
            const timer = new Timer(
                serialized.resource_type,
                serialized.resource_id,
                serialized.expires_at,
                serialized.params
            );

            timer._id = serialized.id;
            timer._created_at = serialized.created_at;
            timer._active = serialized.active;
            timer._fired_at = serialized.fired_at;

            return timer;
        }
        return undefined;
    }

    constructor(resource_type, resource_id, expires_at, params = {}) {
        super();

        this._resource_type = resource_type;
        this._resource_id = resource_id;
        this._expires_at = expires_at;
        this._active = true;
        this._params = params;
        this._fired_at = null;
    }

    get active(){
        return this._active;
    }

    get fired_at(){
        return this._fired_at;
    }

    get params(){
        return this._params;
    }

    get resource_type() {
        return this._resource_type;
    }

    get resource_id() {
        return this._resource_id;
    }

    async fetchResource() {
        switch (this._resource_type) {
            case "ActivityManager": {
                const { ActivityManager } = require("./activity_manager");
                return ActivityManager.deserialize(await ActivityManager.fetch(this.resource_id));
            }

            case "Process": {
                const { Process } = require("./process");
                return Process.fetch(this.resource_id);
            }

            case "Mock": {
                return Mock.fetch(this.resource_id);
            }
        }
    }

    get expires_at() {
        return this._expires_at;
    }

    async run(trx=false){
        // this._active = false;
        // this._fired_at = new Date();
        await this.delete(trx);

        const resource = await this.fetchResource();
        resource.timeout(this);
    }

    static timeoutFromNow(seconds) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + seconds);
        return now;
    }

    static async fetchAllReady(){
        let query = this.getPersist().getAllReady();
        const timers = await query;
        return _.map(timers, timer => Timer.deserialize(timer));
    }
}

class Mock {
    static async fetch(id){
        return new Mock(id);
    }

    constructor(id) {
        this.id = id;
    }

    async timeout(timer){
        return timer
    }
}

module.exports = {
    Timer: Timer,
};
