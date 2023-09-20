const emitter = require("../../core/utils/emitter");
const { timerHeartBeat } = require("./timer");
const { processHeartBeat } = require("./process");

const engineHeartBeat = async () => {
  emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);

  await Promise.all([
    timerHeartBeat(),
    processHeartBeat(),
  ]);
}

module.exports = {
  engineHeartBeat,
}