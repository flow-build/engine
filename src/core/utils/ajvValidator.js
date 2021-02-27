const Ajv = require("ajv");
const ajv = new Ajv({
    allErrors: true
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
            properties: {},
            required: schema.required
        }
    } else {
        schemaValidate = schema;
    }

    const dateTimeRegex = new RegExp('^(19[0-9]{2}|2[0-9]{3})-(0[1-9]|1[012])-([123]0|[012][1-9]|31)[ \/T\/t]([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$');
    ajv.addFormat('dateTime', {
        validate: (dateTimeString) => dateTimeRegex.test(dateTimeString)
    });

    const is_valid = ajv.validate(schemaValidate, data);
    if (!is_valid) {
        throw new Error(ajv.errorsText());
    }
}

function validateActivityManager(schema, data) {
    const schemaValidate = {
        properties: {},
        required: schema.required
    }

    Object.entries(schema.properties).map(param => {
        if (param[0] !== 'required') {
            schemaValidate.properties[param[0]] = param[1];
        }
    })

    const is_valid = ajv.validate(schemaValidate, data);
    if (!is_valid) {
        throw new Error(ajv.errorsText());
    }
}

function validateResult(schema, data) {
    const is_valid = ajv.validate(schema, data);
    if (!is_valid) {
        return new Error(ajv.errorsText());
    }
}

module.exports = {
    validateData: validateData,
    validateSchema: validateSchema,
    validateActivityManager: validateActivityManager,
    validateResult: validateResult
};