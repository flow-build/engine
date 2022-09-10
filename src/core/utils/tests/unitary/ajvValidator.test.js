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
      type: "object",
    };

    expect(() => ajvValidator.validateSchema(schema)).not.toThrowError();
  });
});

describe("validateData", () => {
  test("Invalid schema", () => {
    const schema = {
      type: "unknowType",
    };
    const data = 99;
    expect(() => ajvValidator.validateData(schema, data)).toThrowError("schema is invalid");
  });

  test("Throws error with error message", () => {
    const schema = {
      type: "object",
    };
    const data = "input";
    expect(() => ajvValidator.validateData(schema, data)).toThrowError("data must be object");
  });

  test("Throws error with all error messages", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };
    const data = {
      name: { firstName: "exampleName" },
      age: "22",
    };
    try {
      ajvValidator.validateData(schema, data);
    } catch (error) {
      expect(error.message).toMatch("data/name must be string");
      expect(error.message).toMatch("data/age must be number");
    }
  });

  test("Validate uuid", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Validate date-time", () => {
    const schema = {
      type: "object",
      properties: {
        dataInicio: { type: "string", format: "date-time" },
      },
    };
    const data = {
      dataInicio: "2020-11-20T14:44:00.1234Z",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Validate dateTime", () => {
    const schema = {
      type: "object",
      properties: {
        data: { type: "string", format: "dateTime" },
      },
    };
    const data = {
      data: "2020-11-20T14:44:00",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Fast validation date should not work", () => {
    const schema = {
      type: "object",
      properties: {
        data: { type: "string", format: "date" },
      },
    };
    const data = {
      data: "2020-19-20",
    };
    try {
      ajvValidator.validateData(schema, data);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });

  test("Throw error with invalid cpf", () => {
    const schema = {
      type: "object",
      properties: {
        data: { type: "string", format: "cpf" },
      },
    };

    const data = {
      cpf: "123.123.123-12",
    };
    try {
      ajvValidator.validateData(schema, data);
    } catch (resultError) {
      expect(resultError).toBeDefined();
    }
  });

  test("Validate cpf", () => {
    const schema = {
      type: "object",
      properties: {
        data: { type: "string", format: "cpf" },
      },
    };

    const data = {
      cpf: "825.566.405-02",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Validate cpf in schema", () => {
    const schema = {
      type: "object",
      properties: {
        cpf: { type: "string", format: "cpf" },
      },
      required: ["cpf"],
    };
    const data = {
      cpf: "825.566.405-02",
    };
    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error with letter in cpf in schema", () => {
    const schema = {
      type: "object",
      properties: {
        cpf: { type: "string", format: "cpf" },
      },
      required: ["cpf"],
    };
    const data = {
      cpf: "a825.566.405-02",
    };
    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch('data/cpf must match format "cpf"');
  });

  test("Validate date properties", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        dataInicio: { type: "string", format: "date-time" },
        dataFim: { type: "string", format: "date" },
        nome: { type: "string", minLength: 3 },
      },
      required: ["id", "dataInicio", "dataFim", "nome"],
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      dataInicio: "2020-11-20T14:44:00.1234Z",
      dataFim: "2020-11-21",
      nome: "Didi",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Validate multiple properties", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        dataInicio: { type: "string", format: "date-time" },
        dataFim: { type: "string", format: "date" },
        nome: { type: "string", minLength: 3 },
      },
      required: ["id", "dataInicio", "dataFim", "nome"],
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      dataInicio: "2020-11-20T14:44:00.1234Z",
      dataFim: "2020-11-21",
      nome: "Didi",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Fails with missing nome parameter", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        dataInicio: { type: "string", format: "date-time" },
        dataFim: { type: "string", format: "date" },
        nome: { type: "string", minLength: 3 },
      },
      required: ["id", "dataInicio", "dataFim", "nome"],
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      dataInicio: "2020-11-20T14:44:00.1234Z",
      dataFim: "2020-11-21",
    };
    try {
      ajvValidator.validateData(schema, data);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toMatch("data must have required property 'nome'");
    }
  });

  test("Fails with additional properties", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
      required: ["id"],
      additionalProperties: false,
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      nome: "Didi",
    };
    try {
      ajvValidator.validateData(schema, data);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toMatch("data must NOT have additional properties");
    }
  });

  test("Pass with additional properties", () => {
    const schema = {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
      required: ["id"],
      additionalProperties: true,
    };
    const data = {
      id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
      nome: "Didi",
    };
    const resultError = ajvValidator.validateData(schema, data);
    expect(resultError).toBeUndefined();
  });
});

describe("validateResult", () => {
  test("Valid schema with data.data", () => {
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
    };
    const data = {
      status: 201,
      data: {
        id: "5",
        createdAt: "2021-01-12T22:32:28.199Z",
        qty: 1,
        flavors: ["portuguesa"],
        comments: "comentarios",
        status: "pending",
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with required property id in data.data", () => {
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
      status: 201,
      data: {
        id: "5",
        createdAt: "2021-01-12T22:32:28.199Z",
        qty: 1,
        flavors: ["portuguesa"],
        comments: "comentarios",
        status: "pending",
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error without required property id in data.data", () => {
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
      status: 201,
      data: {
        createdAt: "2021-01-12T22:32:28.199Z",
        flavors: ["portuguesa"],
        comments: "comentarios",
        status: "pending",
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch("data must have required property 'id'");
  });

  test("Valid schema with data only", () => {
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
    const schema = {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            save_password: { type: "boolean" },
          },
          required: ["email", "password"],
        },
      },
      required: ["input"],
    };
    const data = {
      input: {
        email: "didi_moco@gmail.com",
        password: "trapalhoes",
        save_password: true,
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with required in nested items in data data", () => {
    const schema = {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            save_password: { type: "boolean" },
          },
          required: ["email", "password"],
        },
      },
      required: ["input"],
    };
    const data = {
      data: {
        input: {
          email: "didi_moco@gmail.com",
          password: "trapalhoes",
          save_password: true,
        },
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error with required in nested items in data only", () => {
    const schema = {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            save_password: { type: "boolean" },
          },
          required: ["email", "password"],
        },
      },
      required: ["input"],
    };
    const data = {
      input: {
        email: "didi_moco@gmail.com",
        save_password: true,
      },
    };

    const resultError = ajvValidator.validateResult(schema, data);
    expect(resultError).toBeDefined();
    expect(resultError.message).toMatch("data/input must have required property 'password'");
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
    };

    const data = {
      id: "5",
      qty: 1,
      status: "pending",
      flavors: ["portuguesa"],
      comments: "comentarios",
      createdAt: "2021-01-12T22:32:28.199Z",
    };

    const resultError = ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with an empty object", () => {
    const schema = {};
    const data = {
      id: "5",
      qty: 1,
    };

    const resultError = ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error without required property id", () => {
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
      qty: 1,
      status: "pending",
      flavors: ["portuguesa"],
      comments: "comentarios",
      createdAt: "2021-01-12T22:32:28.199Z",
    };

    const resultError = () => ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toThrowError("data must have required property 'id'");
  });

  test("Should rebuild schema if no type object is defined", () => {
    const schema = {
      properties: {
        id: { type: "string" },
        qty: { type: "number" },
        status: { type: "string" },
        flavors: { type: "array" },
        comments: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
      },
    };

    const data = {
      id: "5",
      qty: 1,
      status: "pending",
      flavors: ["portuguesa"],
      comments: "comentarios",
      createdAt: "2021-01-12T22:32:28.199Z",
    };

    const resultError = ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Pass with required in nested items", () => {
    const schema = {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            save_password: { type: "boolean" },
          },
          required: ["email", "password"],
        },
      },
      required: ["input"],
    };
    const data = {
      input: {
        email: "didi_moco@gmail.com",
        password: "trapalhoes",
        save_password: true,
      },
    };

    const resultError = ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toBeUndefined();
  });

  test("Throw error with required in nested items", () => {
    const schema = {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
            save_password: { type: "boolean" },
          },
          required: ["email", "password"],
        },
      },
      required: ["input"],
    };
    const data = {
      input: {
        email: "didi_moco@gmail.com",
        save_password: true,
      },
    };

    const resultError = () => ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toThrowError("data/input must have required property 'password'");
  });

  test("Throw error with date on format YYYY-1X-DD", async () => {
    const schema = {
      type: "object",
      properties: {
        dt: { type: "string", format: "date" },
      },
      required: ["dt"],
    };
    const data = {
      dt: "2021-19-12",
    };

    const resultError = () => ajvValidator.validateActivityManager(schema, data);
    expect(resultError).toThrowError('data/dt must match format "date"');
  });
});
