const winston = require('winston');

const myformat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

let logger;

function createLogger(logerLevel) {
    logger = winston.createLogger({
        level: logerLevel || 'info',
        transports: [
            new winston.transports.Console({
                format: myformat
            })
        ]
    });
}
function printMessage(logMessage) {

    if (logMessage.messageLevel) {
        logger[logMessage.level](`${JSON.stringify(logMessage.messageLevel)}`);
    }
    if (logMessage.messageInfo) {
        logger[logMessage.level](`${JSON.stringify(logMessage.messageInfo)}`);
    }
    if (logMessage.variable) {
        logger[logMessage.level](`${JSON.stringify(logMessage.variable)}`);
    }
}
module.exports = {
    printMessage: printMessage,
    createLogger: createLogger
} ;

