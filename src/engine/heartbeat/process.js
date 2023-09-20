
const emitter = require("../../core/utils/emitter");
const { Process } = require("../../core/workflow/process");
const { ENGINE_ID } = require("../../core/workflow/process_state");

const processHeartBeat = async () => {
  const PROCESS_BATCH = process.env.PROCESS_BATCH || 10;
  const processes = await Process.getPersist()._db.transaction(async (trx) => {
    try {
      emitter.emit("ENGINE.PROCESSES_FETCHING", `  FETCHING PROCESSES ON HEARTBEAT BATCH [${PROCESS_BATCH}]`);
      const locked_processes = await trx("process")
        .select("process.*")
        .join("process_state", "process_state.id", "process.current_state_id")
        .where("engine_id", "!=", ENGINE_ID)
        .where("current_status", "running")
        .limit(PROCESS_BATCH)
        .forUpdate()
        .skipLocked();
      emitter.emit("ENGINE.PROCESSES_FETCHED", `  FETCHED [${locked_processes.length}] PROCESSES ON HEARTBEAT`, {
        processes: locked_processes.length,
      });
      return await Promise.all(
        locked_processes.map(async (process) => {
          emitter.emit("ENGINE.PROCESS_FETCHING", `  FETCHING PS FOR PROCESS [${process.id}] ON HEARTBEAT`, {
            process_id: process.id,
          });
          process.state = await trx("process_state")
            .select()
            .where("id", process.current_state_id)
            .where("engine_id", "!=", ENGINE_ID)
            .forUpdate()
            .noWait()
            .first();
          emitter.emit("ENGINE.PROCESS_FETCHED", `  FETCHED PS FOR PROCESS [${process.id}] ON HEARTBEAT`, {
            process_id: process.id,
          });
          if (process.state) {
            return Process.deserialize(process);
          }
        })
      );
    } catch (e) {
      emitter.emit("ENGINE.PROCESS.ERROR", "  ERROR FETCHING PROCESSES ON HEARTBEAT", { error: e });
      throw new Error(e);
    }
  });
  const continue_promises = processes.map((process) => {
    if (process) {
      emitter.emit(
        "ENGINE.PROCESS.CONTINUE",
        `    START CONTINUE PROCESS PID [${process.id}] AND STATE [${process.state.id}] ON HEARTBEAT`,
        {
          process_id: process.id,
          process_state_id: process.state.id,
        }
      );
      return process.continue({}, process.state._actor_data);
    }
  });
  await Promise.all(continue_promises);
}

module.exports = {
  processHeartBeat,
}