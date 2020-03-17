const ajvValidator = require("../../ajvValidator");

describe("validateSchema", () => {
    test("Throw error for invalid schema", () => {
        const schema = {
            type: "unknowType",
        };

        expect(() => ajvValidator.validateSchema(schema)).toThrowError();
    });

    test("No error for valid schema", () => {
        const schema = {
            type: "object"
        };

        expect(() => ajvValidator.validateSchema(schema)).not.toThrowError();
    })
})

describe("validateData", () => {
    test("Invalid schema", () => {
        const schema = {
            type: "unknowType",
        }
        const data = 99;
        expect(() => ajvValidator.validateData(schema, data)).toThrowError("schema is invalid");
    })

    test("Throws error with error message", () => {
        const schema = {
            type: "object"
        };
        const data = "input";
        expect(() => ajvValidator.validateData(schema, data)).toThrowError("should be object");
    });

    test("Throws error with all error messages", () => {
        const schema = {
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" }
            }
        };
        const data = {
            name: { firstName: "exampleName" },
            age: "22",
        };
        try {
            ajvValidator.validateData(schema, data)
        } catch (error) {
            expect(error.message).toMatch("name should be string");
            expect(error.message).toMatch("age should be number");
        }
    })
})