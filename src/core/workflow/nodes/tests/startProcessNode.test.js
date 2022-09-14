const _ = require("lodash");
const { minimal } = require("../examples/startProcess");
const { StartProcessSystemTaskNode } = require("../startProcess");
const process_manager = require("../../process_manager");
const { ProcessStatus } = require("../../process_state");
const { Workflow } = require("../../workflow");

describe("static Schema", () => {
  test("Should merge Node and UserTaskNode schema", async () => {
    const schema = StartProcessSystemTaskNode.schema;
    expect(schema.properties.id).toBeDefined();
    expect(schema.properties.next.type).toBe("string");
    expect(schema.properties.parameters.required).toEqual(
      expect.arrayContaining(["actor_data", "input", "workflow_name"])
    );
  });
});

describe("Validations", () => {
  let spec;
  beforeEach(() => {
    spec = _.cloneDeep(minimal);
  });

  test("Must have workflow_name", () => {
    delete spec.parameters.workflow_name;
    const node = new StartProcessSystemTaskNode(spec);
    const [isValid, reason] = node.validate();
    expect(isValid).toBeFalsy();
    expect(reason).toMatch("must have required property 'workflow_name'");
  });

  test("workflow_name can be a string", () => {
    spec.parameters.workflow_name = "22";
    const node = new StartProcessSystemTaskNode(spec);
    const [isValid, reason] = node.validate();
    expect(isValid).toBeTruthy();
    expect(reason).toBe("null");
  });

  test("workflow_name can be an object", () => {
    spec.parameters.workflow_name = { $ref: "result.value" };
    const node = new StartProcessSystemTaskNode(spec);
    const [isValid, reason] = node.validate();
    expect(isValid).toBeTruthy();
    expect(reason).toBe("null");
  });

  test("workflow_name cannot be number", () => {
    spec.parameters.workflow_name = 22;
    const node = new StartProcessSystemTaskNode(spec);
    const [is_valid, reason] = node.validate();
    expect(is_valid).toBeFalsy();
    expect(reason).toMatch("must match exactly one schema in oneOf");
  });

  test("Must have actor_data", () => {
    delete spec.parameters.actor_data;
    const node = new StartProcessSystemTaskNode(spec);
    const [is_valid, reason] = node.validate();
    expect(is_valid).toBeFalsy();
    expect(reason).toMatch("must have required property 'actor_data'");
  });

  test("actor_data must be an object", () => {
    spec.parameters.actor_data = "1";
    const node = new StartProcessSystemTaskNode(spec);
    const [is_valid, reason] = node.validate();
    expect(is_valid).toBeFalsy();
    expect(reason).toMatch("properties/actor_data");
    expect(reason).toMatch("must be object");
  });
});

describe("StartProcessSystemTaskNode", () => {
  test("creates and run process by engine", async () => {
    let original_createProcessByWorkflowName = process_manager.createProcessByWorkflowName;
    let original_runProcess = process_manager.runProcess;
    try {
      const mock = jest.fn().mockResolvedValue({ workflow: { id: "1234" } });
      Workflow.fetchWorkflowByName = mock;

      const process_id = "9090";
      const mock_createProcessByWorkflowName = jest.fn().mockResolvedValue({
        id: process_id,
      });
      const mock_runProcess = jest.fn();

      process_manager.createProcessByWorkflowName = mock_createProcessByWorkflowName;
      process_manager.runProcess = mock_runProcess;

      const spec = minimal;
      const node = new StartProcessSystemTaskNode(spec);

      const result = await node.run({});

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);
      expect(result.result).toEqual({ process_id: process_id });

      const expected_workflow_name = spec.parameters.workflow_name;
      const expected_workflow_actor_data = {
        parentProcessData: {
          id: null,
        },
      };
      const expected_workfow_input = {};

      expect(mock_createProcessByWorkflowName).toBeCalledTimes(1);
      expect(mock_createProcessByWorkflowName).toBeCalledWith(
        expected_workflow_name,
        expected_workflow_actor_data,
        expected_workfow_input
      );

      expect(mock_runProcess).toBeCalledTimes(1);
      expect(mock_runProcess).toBeCalledWith(process_id, expected_workflow_actor_data);
    } finally {
      process_manager.createProcessByWorkflowName = original_createProcessByWorkflowName;
      process_manager.runProcess = original_runProcess;
    }
  });

  test("breaks if the workflow name does not exist", async () => {
    const mock = jest.fn();
    Workflow.fetchWorkflowByName = mock;

    const spec = _.cloneDeep(minimal);
    const node = new StartProcessSystemTaskNode(spec);
    const result = await node.run({});
    expect(result).toBeDefined();
    expect(result.status).toEqual(ProcessStatus.ERROR);
    expect(result.result.error).toEqual("workflow not found");
  });
});

describe("preProcess workflow data", () => {
  let original_createProcessByWorkflowName = process_manager.createProcessByWorkflowName;
  let original_runProcess = process_manager.runProcess;
  let original_FetchWorkflowByName = Workflow.fetchWorkflowByName;
  let mock_createProcessByWorkflowName = jest.fn().mockResolvedValue({ id: "1239" });
  let mock_runProcess = jest.fn();
  let mock_FetchWorkflowByName = jest.fn().mockResolvedValue({ workflow: { id: "1234" } });
  let spec = minimal;

  beforeEach(() => {
    mock_createProcessByWorkflowName.mockClear();
    mock_runProcess.mockClear();
    mock_FetchWorkflowByName.mockClear();

    process_manager.createProcessByWorkflowName = mock_createProcessByWorkflowName;
    process_manager.runProcess = mock_runProcess;
    Workflow.fetchWorkflowByName = mock_FetchWorkflowByName;

    spec = _.cloneDeep(minimal);
  });

  afterEach(() => {
    process_manager.createProcessByWorkflowName = original_createProcessByWorkflowName;
    process_manager.runProcess = original_runProcess;
    Workflow.fetchWorkflowByName = original_FetchWorkflowByName;
  });

  describe("workflow_name", () => {
    test("$ref bag", async () => {
      spec.parameters.workflow_name = { $ref: "bag.workflow_name" };

      const node = new StartProcessSystemTaskNode(spec);
      const result = await node.run({
        bag: {
          workflow_name: "bag_workflow_name",
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "bag_workflow_name",
        {
          parentProcessData: {
            id: null,
          },
        },
        {}
      );
    });

    test("$ref result", async () => {
      spec.parameters.workflow_name = { $ref: "result.workflow_name" };

      const node = new StartProcessSystemTaskNode(spec);
      const result = await node.run({
        input: {
          workflow_name: "result_workflow_name",
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "result_workflow_name",
        {
          parentProcessData: {
            id: null,
          },
        },
        {}
      );
    });

    test("$mustache result", async () => {
      spec.parameters.workflow_name = { $mustache: "ATV_{{result.workflow_name}}" };

      const node = new StartProcessSystemTaskNode(spec);
      const result = await node.run({
        input: {
          workflow_name: "result_workflow_name",
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "ATV_result_workflow_name",
        {
          parentProcessData: {
            id: null,
          },
        },
        {}
      );
    });
  });

  describe("actor_data", () => {
    test("$ref actor_data", async () => {
      spec.parameters.actor_data = { $ref: "actor_data" };

      const node = new StartProcessSystemTaskNode(spec);
      const result = await node.run({
        actor_data: {
          id: "id_node_runner",
        },
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "example_workflow",
        {
          id: "id_node_runner",
          parentProcessData: {
            id: null,
          },
        },
        {}
      );
    });

    test("$ref environment", async () => {
      spec.parameters.actor_data = { $ref: "environment.actor" };

      const node = new StartProcessSystemTaskNode(spec);
      const result = await node.run({
        environment: {
          actor: {
            id: "id_environment",
          },
        },
        process_id: "1234",
      });

      expect(result).toBeDefined();
      expect(result.status).toEqual(ProcessStatus.RUNNING);

      expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
        "example_workflow",
        {
          id: "id_environment",
          parentProcessData: {
            id: "1234",
          },
        },
        {}
      );
    });
  });

  test("input prepare", async () => {
    spec.parameters.input = {
      creator: { $ref: "actor_data.id" },
      data: { $ref: "result.data" },
      key: { $mustache: "user-{{bag.value}}" },
      flag: { $ref: "environment.active" },
      total: { $js: "() => 2 + 3" },
    };

    const node = new StartProcessSystemTaskNode(spec);
    const result = await node.run({
      bag: {
        value: "example_bag_value",
      },
      actor_data: {
        id: "id_node_runner",
      },
      input: {
        data: "example_result_data",
      },
      environment: {
        active: "true",
      },
      process_id: "1234",
    });

    expect(result).toBeDefined();
    expect(result.status).toEqual(ProcessStatus.RUNNING);

    expect(mock_createProcessByWorkflowName).toHaveBeenCalledWith(
      "example_workflow",
      {
        parentProcessData: {
          id: "1234",
        },
      },
      {
        creator: "id_node_runner",
        data: "example_result_data",
        key: "user-example_bag_value",
        flag: "true",
        total: 5,
      }
    );
  });
});
