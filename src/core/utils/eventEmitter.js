const logUtil = require("./logging");

module.exports = function startEventListener(em) {
  em.on("KNEX.*", (message, variables) => {
    const obj = {
      section: "KNEX",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("REQUESTS.*", (message, variables) => {
    const obj = {
      section: "REQUESTS",
      level: "silly",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("ACTIVITY_MANAGER_TIMER.*", (message, variables) => {
    const obj = {
      section: "ACTIVITY_MANAGER_TIMER",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("ACTIVITY_MANAGER.*", (message, variables) => {
    const obj = {
      section: "ACTIVITY_MANAGER",
      level: "info",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("BLUEPRINT.*", (message, variables) => {
    const obj = {
      section: "BLUEPRINT",
      level: "warn",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("BLUEPRINT.NON_EXISTENT_VARIABLES", (message, variables) => {
    const obj = {
      section: "BLUEPRINT",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("LANE.*", (message, variables) => {
    const obj = {
      section: "LANE",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("NODE.ERROR", (message, variables) => {
    const obj = {
      section: "NODE",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("NODE.RESULT_ERROR", (message, variables) => {
    const obj = {
      section: "NODE",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("NODE.START_VALIDATED", (message, variables) => {
    const obj = {
      section: "NODE",
      level: "info",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("PROCESS.*", (message, variables) => {
    const obj = {
      section: "PROCESS",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("PROCESS.EDGE.*", (message, variables) => {
    const obj = {
      section: "PROCESS",
      level: "info",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("PROCESS.*.ERROR", (message, variables) => {
    const obj = {
      section: "PROCESS",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("PROCESS.TIMER.*", (message, variables) => {
    const obj = {
      section: "PROCESS",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("INNERLOOP.*", (message, variables) => {
    const obj = {
      section: "INNERLOOP",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("EXECUTION_LOOP.*", (message, variables) => {
    const obj = {
      section: "INNERLOOP",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("PROCESS_STATE.*", (message, variables) => {
    const obj = {
      section: "PROCESS_STATE",
      level: "debug",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("ENGINE.ERROR", (message, variables) => {
    const obj = {
      section: "ENGINE",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("ENGINE.*.ERROR", (message, variables) => {
    const obj = {
      section: "ENGINE",
      level: "error",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("ENGINE.*", (message, variables) => {
    const obj = {
      section: "ENGINE",
      level: "silly",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("EXAMPLE.*", (message, variables) => {
    const obj = {
      section: "EXAMPLE",
      level: "info",
      message: message,
      variables: variables,
    };
    logUtil.printMessage(obj);
  });

  em.on("error", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "error",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("warn", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "warn",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("info", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "info",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("http", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "http",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("HTTP.NODE.*", (message, variable) => {
    if(process.env.HTTP_NODE_LOG === "true") {
      const obj = {
        level: variable?.error ? "error" : "info",
        message: `[PID ${variable.process_id}] - ${JSON.stringify(message)}`,
        variable: variable,
        section: `HTTP-${variable.request_id}`
      };
      logUtil.printMessage(obj);
    }
  });

  em.on("verbose", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "verbose",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("debug", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "debug",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });

  em.on("silly", (messageLevel, messageInfo, variable) => {
    const obj = {
      level: "silly",
      messageLevel: messageLevel,
      messageInfo: messageInfo,
      variable: variable,
    };
    logUtil.printMessage(obj);
  });
};
