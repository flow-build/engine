const emitter = require("../../core/utils/emitter");
const { timerHeartBeat } = require("./timer");
const { processHeartBeat } = require("./process");

const engineHeartBeat = async () => {
  emitter.emit("ENGINE.HEARTBEAT", `HEARTBEAT @ [${new Date().toISOString()}]`);

  await timerHeartBeat();
  await processHeartBeat();
}

module.exports = {
  engineHeartBeat,
}