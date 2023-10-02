require("dotenv").config();
const emitter = require("../../core/utils/emitter");
const { timerHeartBeat } = require("./timer");
const { processHeartBeat } = require("./process");
const { readEnvironmentVariableAsNumber } = require("../../core/utils/environment");

const engineHeartBeat = async (engine) => {
  emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);
  const TIMER_BATCH = readEnvironmentVariableAsNumber("TIMER_BATCH", 0);
  const PROCESS_BATCH = readEnvironmentVariableAsNumber("PROCESS_BATCH", 0);

  if (engine?.current_instance === 'TIMER') {
    await timerHeartBeat(TIMER_BATCH);
  } else if (engine?.current_instance === 'PROCESS') {
    await processHeartBeat(PROCESS_BATCH);
  }

  if (engine?.beat_instances?.length === 2) {
    engine.current_instance = engine?.current_instance === 'PROCESS' ? 'TIMER' : 'PROCESS';
  }
}

const getBeatInstances = () => {
  const TIMER_BATCH = readEnvironmentVariableAsNumber("TIMER_BATCH", 0);
  const PROCESS_BATCH = readEnvironmentVariableAsNumber("PROCESS_BATCH", 0);
  const beatInstances = [];

  if (TIMER_BATCH > 0) {
    beatInstances.push("TIMER");
  }

  if (PROCESS_BATCH > 0) {
    beatInstances.push("PROCESS");
  }

  return beatInstances;
}

module.exports = {
  engineHeartBeat,
  getBeatInstances,
}