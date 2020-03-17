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
    const is_valid = ajv.validate(schema, data);
    if (!is_valid) {
        throw new Error(ajv.errorsText());
    }
}

module.exports = {
    validateData: validateData,
    validateSchema: validateSchema,
};