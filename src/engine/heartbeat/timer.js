const emitter = require("../../core/utils/emitter");
const { Timer } = require("../../core/workflow/timer");

const timerHeartBeat = async () => {
  const TIMER_BATCH = process.env.TIMER_BATCH || 40;

  const max_connection_pool = Timer.getPersist()._db.context.client.pool.max
  const connections = Timer.getPersist()._db.context.client.pool.free.length
  const minConnections = 1

  if (connections >= max_connection_pool - minConnections) {
    throw new Error('MAX POOL CONNECTIONS REACHED')
  }

  if (TIMER_BATCH > 0) {
    emitter.emit("ENGINE.FETCHING_TIMERS", `  FETCHING TIMERS ON HEARTBEAT BATCH [${TIMER_BATCH}]`);
    const timerTrx = await Timer.openTransaction();
    try {
      let locked_timers = await Timer.batchLock(TIMER_BATCH, timerTrx);
      emitter.emit("ENGINE.TIMERS", `  FETCHED [${locked_timers.length}] TIMERS ON HEARTBEAT`, {
        timers: locked_timers.length,
      });

      if (connections + (locked_timers.length) >= max_connection_pool - 1) {
        const maxTimers = max_connection_pool - minConnections - 1 - connections
        locked_timers = locked_timers.slice(0, maxTimers)
      }

      await Promise.all(
        locked_timers.map((t_lock) => {
          emitter.emit("ENGINE.FIRING_TIMER", `  FIRING TIMER [${t_lock.id}] ON HEARTBEAT`, {
            timer_id: t_lock.id,
          });
          return Timer.fire(t_lock, timerTrx);
        })
      );
      await timerTrx.commit();
    } catch (e) {
      await timerTrx.rollback();
      throw new Error(e);
    }
  }
}

module.exports = {
  timerHeartBeat,
}