const logUtil = require('./logging');

module.exports = function startEventListener(em) {
    em.on('error', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'error',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('warn', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'warn',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('info', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'info',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('http', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'http',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('verbose', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'verbose',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('debug', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'debug',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });

    em.on('silly', (messageLevel, messageInfo, variable) => {
        const obj = {
            level: 'silly',
            messageLevel: messageLevel,
            messageInfo: messageInfo,
            variable: variable
        }
        logUtil.printMessage(obj);
    });
};