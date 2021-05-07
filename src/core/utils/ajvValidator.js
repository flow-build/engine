const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajv = new Ajv({allErrors: true});
addFormats(ajv);

const dateTimeRegex = new RegExp('^(19[0-9]{2}|2[0-9]{3})-(0[1-9]|1[012])-([123]0|[012][1-9]|31)[ \/T\/t]([01][0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$');
ajv.addFormat('dateTime', {
    validate: (dateTimeString) => dateTimeRegex.test(dateTimeString)
});

ajv.addFormat('cpf', {
    validate: (cpf) => {
        if (/[a-zA-Z]/.test(cpf)) {
            return false;
        }
        cpf = cpf.replace(/\D/g, '');
        if(cpf.toString().length != 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        var result = true;
        [9,10].forEach(function(j){
            var sum = 0, r;
            cpf.split(/(?=)/).splice(0,j).forEach(function(e, i){
                sum += parseInt(e) * ((j+2)-(i+1));
            });
            r = sum % 11;
            r = (r <2)?0:11-r;
            if(r != cpf.substring(j, j+1)) result = false;
        });
        return result;
    },
    errors: false,
})

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
            type: 'object',
            properties: schema.properties,
            required: schema.required,
            additionalProperties: schema.additionalProperties
        }
    } else {
        schemaValidate = schema;
    }

    const is_valid = ajv.validate(schemaValidate, data);
    if (!is_valid) {
        throw new Error(ajv.errorsText());
    }
}

function validateActivityManager(schema, data) {
    const schemaValidate = {
        type: 'object',
        properties: {},
        required: schema.required,
        additionalProperties: schema.additionalProperties
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
            max_step_number: {type: "integer"}
        }
    }

    const is_valid = ajv.validate(schemaBlueprintParametersValidate, data);

    if (!is_valid) {
        throw new Error(ajv.errorsText());
    }
}

module.exports = {
    validateData: validateData,
    validateSchema: validateSchema,
    validateActivityManager: validateActivityManager,
    validateResult: validateResult,
    validateBlueprintParameters: validateBlueprintParameters
};