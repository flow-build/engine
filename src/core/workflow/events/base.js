const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { timerResolver } = require("./timerEventResolver");

const resolverMap = {
  target: {
    timer: timerResolver,
  },
  trigger: {},
};

class Events {
  static get schema() {
    return {
      type: "object",
      required: ["family", "category", "resource"],
      properties: {
        definition: { type: "string" },
        family: { type: "string", enum: ["trigger", "target"] },
        category: {
          type: "string",
          enum: [
            "message",
            "timer",
            "error",
            "escalation",
            "cancel",
            "compensation",
            "conditional",
            "link",
            "signal",
            "terminate",
            "multiple",
            "parallel",
          ],
        },
        input: { type: "object" },
        key: { type: "string" },
        code: { type: "string" },
        rule: { type: "string" },
        dueDate: { type: "string", format: "date-time" },
        cycle: { type: "string" },
        duration: { type: "string" },
        nodes: { type: "array" },
        resource: {
          type: "object",
          required: ["id", "type"],
          properties: {
            id: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["intermediateevent", "usertask", "startnode"] },
            nodeId: { type: "string" },
            stepNumber: { type: "integer" },
          },
        },
      },
    };
  }

  constructor(spec) {
    this._definition = spec.definition ? spec.definition.toLowerCase() : undefined;
    this._family = spec.family ? spec.family.toLowerCase() : undefined;
    this._category = spec.category ? spec.category.toLowerCase() : undefined;
    this._input = spec.input;
    this._key = spec.key;
    this._code = spec.code;
    this._rule = spec.rule;
    this._dueDate = spec.dueDate;
    this._cycle = spec.cycle;
    this._duration = spec.duration;
    this._nodes = spec.nodes;
    this._resource = {
      id: spec.resource?.id,
      type: spec.resource?.type.toLowerCase(),
      stepNumber: spec.resource?.stepNumber,
      nodeId: spec.resource?.nodeId,
    };
  }

  serialize() {
    return {
      definition: this._definition,
      family: this._family,
      category: this._category,
      input: this._input,
      key: this._key,
      code: this._code,
      rule: this._rule,
      dueDate: this._dueDate,
      cycle: this._cycle,
      duration: this._duration,
      nodes: this._nodes,
      resource: this._resource,
    };
  }

  validate() {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(Events.schema);
    const validation = validate(this.serialize());
    return { isValid: validation, errors: validate.errors };
  }

  async create() {
    const validation = this.validate();
    if (!validation.isValid) {
      return validation;
    }

    console.log(`CREATING ${this._family} EVENT, CATEGORY ${this._category}`);
    const resolver = resolverMap[this._family][this._category];
    if (!resolver) {
      return { errors: "resolver not found" };
    }
    return await resolver(this.serialize());
  }
}

module.exports = {
  Events,
};
