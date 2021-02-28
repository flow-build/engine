const lisp = require("../src/core/lisp");
const settings = require("../settings/settings");
const { Engine } = require("../src/engine/engine");
const startLogger = require("../src/core/utils/logging");
const emitter = require("../src/core/utils/emitter");

const blueprint_spec = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            dataInicio: { type: "string", format: "date-time" },
            dataFim: { type: "string", format: "date" },
            nome: { type: "string", minLength: 3 },
            email: { type: "string", format: "email" },
            animal: { type: "string", enum: ["cachorro", "gato"] },
            idade: { type: "number" },
            lista: { type: "array", items: { type: "string" } },
            endereco: {
              type: "object",
              properties: {
                logradouro: { type: "string" },
                numero: { type: "number" }
              }
            },
            contatos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  telefone: { type: "string", pattern: '(\\(?\\d{2}\\)?\\s)?(\\d{4,5}\\-\\d{4})' }
                }
              }
            }
          },
            required: ["dataInicio"]
        }
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Create values for bag",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "",
          function: [
            "fn",
            ["&", "args"],
            {
              example: "bag_example",
              value: "bag_value",
            },
          ],
        },
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set values on bag",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          example: { "$ref": "result.example" },
          valueResult: { "$ref": "result.value" }
        }
      }
    },
    {
      id: "4",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "default",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

const actor_data = {
  id: "1",
  claims: []
};

startLogger(emitter);

const run_example = async () => {
  emitter.emit("===  RUNNING input_schema_example  ===");
  const engine = new Engine(...settings.persist_options);
  const workflow = await engine.saveWorkflow("bag_example", "bag showcase", blueprint_spec);

  const initial_bag = {
    id: "3d2f6ce3-ed63-40aa-89bb-048fed01c15c",
    dataInicio: "2020-11-20T14:44:00.1234Z",
    dataFim: "2020-11-21",
    nome: "didi",
    email: "didi@trap.com",
    animal: "cachorro",
    idade: 20,
    lista: ["quarto", "sala"],
    endereco: {
      logradouro: "Rua Claudio Soares",
      numero: 72
    },
    contatos: [
      {
        nome: "fulano",
        telefone: "(11) 98745-4572"
      },
      {
        nome: "ciclano",
        telefone: "(11) 2361-9830"
      }
    ]
  }

  const process = await engine.createProcess(workflow.id, actor_data, initial_bag);
  const process_id = process.id;
  await engine.runProcess(process_id, actor_data);
  const state_history = await engine.fetchProcessStateHistory(process_id);
  return state_history;
}

run_example().then(res => { emitter.emit(res); });
