const { VM } = require('vm2');

module.exports.readEnvironmentVariableAsBool = function (varname, default_value) {
  const raw = process.env[varname]

  if (typeof raw === 'undefined') {
    return default_value
  }

  try {
    return !!new VM().run(raw)
  } catch (cause) {
    throw new Error(
      `Error while evaluating env ${varname} as bool, should be valid JS expression`,
      { cause }
    )
  }
}

module.exports.readEnvironmentVariableAsNumber = function (varname, default_value) {
  const raw = process.env[varname]

  if (typeof raw === 'undefined') {
    return default_value
  }

  try {
    return Number(raw)
  } catch (cause) {
    throw new Error(
      `Error while evaluating env ${varname} as number, should be valid JS expression`,
      { cause }
    )
  }
}
