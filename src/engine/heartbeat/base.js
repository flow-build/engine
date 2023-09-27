require("dotenv").config();
const emitter = require("../../core/utils/emitter");
const { timerHeartBeat } = require("./timer");
const { processHeartBeat } = require("./process");


const engineHeartBeat = async (engine) => {
  emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);
  emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT INSTANCE [${engine?.beat_instance}]`);

  if (engine?.beat_instance === 'TIMER') {
    await timerHeartBeat();
  } else if (engine?.beat_instance === 'PROCESS') {
    await processHeartBeat();
  }

  if (engine?.beat_instances?.includes('TIMER') && engine?.beat_instances?.includes('PROCESS')) {
    engine.beat_instance = engine?.beat_instance === 'TIMER' ? 'PROCESS' : 'TIMER';
  }
}

module.exports = {
  engineHeartBeat,
}