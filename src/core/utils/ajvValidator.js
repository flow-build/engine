const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajv = new Ajv({ allErrors: true });
addFormats(ajv, { mode: "full" });
const _ = require("lodash");

// eslint-disable-next-line no-useless-escape
const dateTimeRegex = new RegExp(
  "^(19\\d{2}|2\\d{3})-(0[1-9]|1[012])-([123]0|[012][1-9]|31)[ /T/t]([01]\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?$"
);
ajv.addFormat("dateTime", {
  validate: (dateTimeString) => dateTimeRegex.test(dateTimeString),
});

ajv.addFormat("cpf", {
  validate: (cpf) => {
    if (/[a-zA-Z]/.test(cpf)) {
      return false;
    }
    cpf = cpf.replace(/\D/g, "");
    if (cpf.toString().length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    var result = true;
    [9, 10].forEach(function (j) {
      let sum = 0,
        r;
      cpf
        .split(/(?=)/)
        .splice(0, j)
        .forEach(function (e, i) {
          sum += parseInt(e) * (j + 2 - (i + 1));
        });
      r = sum % 11;
      r = r < 2 ? 0 : 11 - r;
      if (r != cpf.substring(j, j + 1)) result = false;
    });
    return result;
  },
  errors: false,
});

function validateSchema(schema) {
  const is_valid = ajv.validateSchema(schema);
  if (!is_valid) {
    throw new Error(ajv.errorsText());
  }
}

function validateData(schema, data) {
  let schemaValidate;
  if (schema.properties) {
    schemaValidate = {
      type: "object",
      properties: schema.properties,
      required: schema.required,
      additionalProperties: schema.additionalProperties,
    };
  } else {
    schemaValidate = schema;
  }

  const is_valid = ajv.validate(schemaValidate, data);
  if (!is_valid) {
    throw new Error(ajv.errorsText());
  }
}

function validateActivityManager(schema, data) {
  let schemaValidate = _.cloneDeep(schema);
  schemaValidate.type = "object";
  const is_valid = ajv.validate(schemaValidate, data);
  if (!is_valid) {
    throw new Error(ajv.errorsText());
  }
}

function validateResult(schema, data) {
  let dataValidate;
  if (data.data) {
    dataValidate = data.data;
  } else {
    dataValidate = data;
  }
  const is_valid = ajv.validate(schema, dataValidate);
  if (!is_valid) {
    return new Error(ajv.errorsText());
  }
}

function validateBlueprintParameters(data) {
  const schemaBlueprintParametersValidate = {
    type: "object",
    properties: {
      max_step_number: { type: "integer" },
      _extract: { type: "boolean" },
    },
  };

  const is_valid = ajv.validate(schemaBlueprintParametersValidate, data);

  if (!is_valid) {
    return new Error(ajv.errorsText());
  }
}

function validateTimeInterval(input) {
  let schemaValidate;

  schemaValidate = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      date: {
        oneOf: [{ type: "number" }, { type: "string", format: "dateTime" }],
      },
      resource_type: { type: "string", enum: ["ActivityManager", "Process", "Mock"] },
    },
  };

  const is_valid = ajv.validate(schemaValidate, input);
  if (!is_valid) {
    throw new Error(ajv.errorsText());
  }
}

module.exports = {
  validateData: validateData,
  validateSchema: validateSchema,
  validateActivityManager: validateActivityManager,
  validateResult: validateResult,
  validateBlueprintParameters: validateBlueprintParameters,
  validateTimeInterval: validateTimeInterval,
};
