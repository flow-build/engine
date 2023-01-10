require("dotenv").config();
const envs = () => {
  try {
    const { Platform } = require("react-native");
    if (Platform) {
      const envs = require("../../../../../envs");
      return envs;
    } else {
      return process.env;
    }
  } catch (err) {
    return new Error("Envs Not Found");
  }
};
module.exports = { envs };