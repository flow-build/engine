const winston = require("winston");

const myformat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

let logger;

function createLogger(logerLevel) {
  logger = winston.createLogger({
    level: logerLevel || "info",
    transports: [
      new winston.transports.Console({
        format: myformat,
      }),
    ],
  });
}
function printMessage(logMessage) {
  const label = logMessage.section || "FLOWBUILD";
  const level = logMessage.level || "info";

  logger.log({
    level,
    message: `[${label}] ${JSON.stringify(logMessage.message)}`,
  });
}
module.exports = {
  printMessage: printMessage,
  createLogger: createLogger,
};
