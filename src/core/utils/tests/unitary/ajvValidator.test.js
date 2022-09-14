const _ = require("lodash");
const ajvValidator = require("../../ajvValidator");

const mainSchema = {
  type: "object",
  properties: {
    stringType: { type: "string" },
    numberType: { type: "number" },
    uuidType: { type: "string", format: "uuid" },
    flavors: { type: "array" },
    cpfType: { type: "string", format: "cpf" },
    dateTimeType: { type: "string", format: "dateTime" },
    dateType: { type: "string", format: "date" },
  },
};

describe("validateSchema", () => {
  test("Throw error for invalid schema", () => {
    const schema = { type: "unknowType" };
    expect(() => ajvValidator.validateSchema(schema)).toThrowError();
  });

  test("No error for valid schema", () => {
    expect(() => ajvValidator.validateSchema(mainSchema)).not.toThrowError();
  });
});

describe("validateData", () => {
  test("Invalid schema", () => {
    expect(() => ajvValidator.validateData({ type: "unknowType" }, 99)).toThrowError("schema is invalid");
  });

  test("Throws error with error message", () => {
    expect(() => ajvValidator.validateData(mainSchema, "input")).toThrowError("data must be object");
  });

  test("Throws error with all error messages", () => {
    const data = {
      stringType: { firstName: "exampleName" },
      numberType: "22",
    };
    try {
      ajvValidator.validateData(mainSchema, data);
    } catch (error) {
      expect(error.message).toMatch("data/stringType must be string");
      expect(error.message).toMatch("data/numberType must be number");
    }
  });

  test("Fast validation date should not work", () => {
    const data = { dateType: "2020-19-20" };
    try {
      ajvValidator.validateData(mainSchema, data);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });

  describe("custom formats", () => {
    test("dateTime", () => {
      const data = { data: "2020-11-20T14:44:00" };
      const resultError = ajvValidator.validateData(mainSchema, data);
      expect(resultError).toBeUndefined();
    });

    describe("cpf", () => {
      test("Validate a valid cpf", () => {
        const data = { cpfType: "825.566.405-02" };
        const resultError = ajvValidator.validateData(mainSchema, data);
        expect(resultError).toBeUndefined();
      });

      test("Throw error with invalid cpf", () => {
        const data = { cpfType: "123.123.123-12" };
        try {
          ajvValidator.validateData(mainSchema, data);
        } catch (resultError) {
          expect(resultError).toBeDefined();
        }
      });

      test("Throw error with letter in cpf in schema", () => {
        const data = { cpfType: "a825.566.405-02" };
        const resultError = ajvValidator.validateResult(mainSchema, data);
        expect(resultError).toBeDefined();
        expect(resultError.message).toMatch('data/cpfType must match format "cpf"');
      });
    });
  });
});

describe("validateResult", () => {
  const nestedRequiredSchema = {
    type: "object",
    properties: {
      input: {
        type: "object",
        properties: {
          emailType: { type: "string", format: "email" },
          stringType: { type: "string" },
          booleanType: { type: "boolean" },
        },
        required: ["emailType", "booleanType"],
      },
    },
    required: ["input"],
  };

  const testData = {
    input: {
      emailType: "didi_moco@gmail.com",
      stringType: "trapalhoes",
      booleanType: true,
    },
  };

  test("Valid schema with data.data", () => {
    const data = {
      status: 201,
      data: {
        stringType: "5",
        numberType: 1,
        arrayType: ["portuguesa"],
      },
    };
    const resultError = ajvValidator.validateResult(mainSchema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error without required property id in data.data", () => {
    const schema = _.cloneDeep(mainSchema);
    schema.required = ["stringType"];
    const data = {
      status: 201,
      data: {
        numberType: 10,
        arrayType: ["other"],
      },
    };
    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch("data must have required property 'stringType'");
  });

  test("Valid schema with data only", () => {
    const data = {
      stringType: "any",
      numberType: 2,
    };
    const resultError = ajvValidator.validateResult(mainSchema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with required property id in data only", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        qty: { type: "number" },
        status: { type: "string" },
        flavors: { type: "array" },
        comments: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
      required: ["id"],
    };
    const data = {
      id: "5",
      createdAt: "2021-01-12T22:32:28.199Z",
      qty: 1,
      flavors: ["portuguesa"],
      comments: "comentarios",
      status: "pending",
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error without required property id in data only", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        qty: { type: "number" },
        status: { type: "string" },
        flavors: { type: "array" },
        comments: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
      required: ["id"],
    };
    const data = {
      createdAt: "2021-01-12T22:32:28.199Z",
      flavors: ["portuguesa"],
      comments: "comentarios",
      status: "pending",
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch("data must have required property 'id'");
  });

  test("Pass with required in nested items in data only", () => {
    const resultError = ajvValidator.validateResult(nestedRequiredSchema, testData);
    expect(resultError).toBeUndefined();
  });

  test("Pass with required in nested items in data data", () => {
    const data = { data: testData };
    const resultError = ajvValidator.validateResult(nestedRequiredSchema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error with required in nested items in data only", () => {
    const data = _.cloneDeep(testData);
    delete data.input.emailType;

    const resultError = ajvValidator.validateResult(nestedRequiredSchema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch("data/input must have required property 'emailType'");
  });
});

describe("validateTimeInterval", () => {
  test("Pass with date type number", () => {
    const input = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      date: 120,
      resource_type: "ActivityManager",
    };
    const resultError = ajvValidator.validateTimeInterval(input);
    expect(resultError).toBeUndefined();
  });

  test("Pass with date type dateTime", () => {
    const input = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      date: "2022-05-13T00:00:00",
      resource_type: "ActivityManager",
    };
    const resultError = ajvValidator.validateTimeInterval(input);
    expect(resultError).toBeUndefined();
  });

  test("Throw error with invalid date type", () => {
    const input = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      date: "120",
      resource_type: "ActivityManager",
    };
    try {
      ajvValidator.validateTimeInterval(input);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });
});

describe("validateActivityManager", () => {
  test("Pass with a valid schema", () => {
    const data = {
      stringType: "string",
      numberType: 8,
      arrayType: ["one more"],
    };

    const resultError = ajvValidator.validateActivityManager(mainSchema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with an empty object", () => {
    const resultError = ajvValidator.validateActivityManager({}, { data: "any" });
    expect(resultError).toBeUndefined();
  });

  test("Should rebuild schema if no type object is defined", () => {
    const schema = {
      properties: {
        id: { type: "string" },
      },
    };

    const data = { id: "5" };

    const resultError = ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Should throw errors with a invalid data with a valid schema", () => {
    const data = {
      numberType: "8",
    };

    try {
      ajvValidator.validateActivityManager(mainSchema, data);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });

  test("Pass with an empty object", () => {
    const resultError = ajvValidator.validateActivityManager({}, { data: "any" });
    expect(resultError).toBeUndefined();
  });
});

describe("validateBlueprintParameters", () => {
  test("should work with a valid schema", () => {
    const parameters = { max_step_number: 8 };
    const resultError = ajvValidator.validateBlueprintParameters(parameters);
    expect(resultError).toBeUndefined();
  });

  test("Should throw error with a invalid parameter", () => {
    const parameters = { max_step_number: "any" };
    try {
      ajvValidator.validateBlueprintParameters(parameters);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });
});
