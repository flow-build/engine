const lisp = require("../../../lisp");

const blueprints_ = {};
const actors_ = {};

blueprints_.minimal = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.identity_system_task = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {}
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish name",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.start_with_data = {
  requirements: [],
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
            number: { type: "number" },
            name: { type: "string" },
          },
          required: ['number', 'name'],
        },
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "UserTask",
      name: "Identity user task",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {
          start_data: { $ref: "result" }
        }
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {}
};

blueprints_.identity_user_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "UserTask",
      name: "User task",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {
          question: "Insert some input."
        }
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.notify_user_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "UserTask",
      name: "Identity user task",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "do something",
        activity_manager: "notify",
        input: {
          question: "Insert some input."
        }
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.notify_and_user_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      next: "2",
      lane_id: "1",
      parameters: {
        input_schema: {}
      }
    },
    {
      id: "2",
      type: "UserTask",
      name: "Identity user task notify",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "do something",
        activity_manager: "notify",
        input: {
          question: "Insert some input."
        }
      }
    },
    {
      id: "3",
      type: "UserTask",
      name: "Identity user task",
      next: "99",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {
          question: "Insert some input."
        }
      }
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {}
};

blueprints_.admin_identity_system_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {}
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "admin",
      rule: lisp.validate_claim("admin")
    }
  ],
  environment: {},
};

blueprints_.admin_identity_user_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "UserTask",
      name: "User task",
      next: "3",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {}
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "admin",
      rule: lisp.validate_claim("admin")
    }
  ],
  environment: {},
};


blueprints_.restricted_multilane_identity_user_task = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "2",
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "3",
      lane_id: "2",
      parameters: {
        input: {}
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "System node name",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {}
      }
    },
    {
      id: "4",
      type: "UserTask",
      name: "Userser task",
      next: "5",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {}
      }
    },
    {
      id: "5",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "2"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "sys_admin",
      rule: lisp.validate_claim("sys_admin")
    },
    {
      id: "2",
      name: "admin",
      rule: lisp.validate_claim("admin")
    }
  ],
  environment: {},
};

blueprints_.extra_nodes = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "SystemTask",
      category: "custom",
      name: "Test System Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "example",
      name: "Test User Task node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {},
        example: "data"
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
      name: "sys_admin",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.lisp_prepare = {
  requirements: ["core"],
  prepare: ["do",
    ["def", "test_function",
      ["fn", ["&", "args"],
        { "result": "Prepare New Bag" }]],
    null
  ],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_function"
        }
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "SystemTask SetToBag node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          new_bag: { "$ref": "result.result" }
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
      name: "sys_admin",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.lisp_requirements = {
  requirements: [
    "core",
    "test_package"
  ],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_1"
        }
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "SystemTask SetToBag node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          new_bag: { "$ref": "result.result" },
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
      name: "sys_admin",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.lisp_requirements_prepare = {
  requirements: [
    "core",
    "test_package"
  ],
  prepare: ["do",
    ["def", "test_function",
      ["fn", ["&", "args"],
        { "new_bag": "New Bag" }]],
    null
  ],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_function"
        }
      }
    },
    {
      id: "3",
      type: "SystemTask",
      category: "SetToBag",
      name: "SystemTask SetToBag node",
      next: "4",
      lane_id: "1",
      parameters: {
        input: {
          new_bag: { "$ref": "result.new_bag" }
        }
      }
    },
    {
      id: "4",
      type: "UserTask",
      name: "User task",
      next: "5",
      lane_id: "1",
      parameters: {
        action: "do something",
        input: {
          new_bag: { "$ref": "bag.new_bag" },
        }
      }
    },
    {
      id: "5",
      type: "ScriptTask",
      name: "Script Task node",
      next: "6",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_2_js",
          type: "js"
        }
      }
    },
    {
      id: "6",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag Task node",
      next: "7",
      lane_id: "1",
      parameters: {
        input: {
          new_bag: { "$ref": "result.result" }
        }
      }
    },
    {
      id: "7",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "simpleton",
      rule: lisp.return_true()
    }
  ],
  environment: {},
}

blueprints_.use_actor_data = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag actor data user run",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          runUser: { $ref: "actor_data" },
        },
      },
    },
    {
      id: "3",
      type: "UserTask",
      name: "User task",
      next: "4",
      lane_id: "1",
      parameters: {
        action: "user_action",
        input: {},
      },
    },
    {
      id: "4",
      type: "SystemTask",
      category: "SetToBag",
      name: "SetToBag actor data continue userTask",
      next: "99",
      lane_id: "1",
      parameters: {
        input: {
          continueUser: { $ref: "actor_data" },
        },
      },
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1",
    },
  ],
  lanes: [
    {
      id: "1",
      name: "simpleton",
      rule: lisp.return_true()
    }
  ],
  environment: {},
}

blueprints_.missing_requirements = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {},
        script: {
          package: "core",
          function: "test_core_1"
        }
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "simpleton",
      rule: lisp.return_true()
    }
  ],
  environment: {},
}

blueprints_.syntax_error = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "ScriptTask",
      name: "Script Task node",
      next: "3",
      lane_id: "1",
      parameters: {
        input: {
          internal_key: { "$ref": "bag.inexistant" }
        },
        script: {
          package: "core",
          function: ["fn", ["&", "args"], ["nth", "args", 0]]
        }
      }
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "simpleton",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.environment = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      next: "2",
      lane_id: "1",
      parameters: {
        input_schema: {}
      }
    },
    {
      id: "2",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {
    node_env: "NODE_ENV",
    host: "API_HOST",
  },
};

blueprints_.reference_environment = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      next: "2",
      lane_id: "1",
      parameters: {
        input_schema: {}
      }
    },
    {
      id: "2",
      type: "SystemTask",
      category: "SetToBag",
      name: "Set to bag node",
      parameters: {
        input: {
          environment: { $ref: "environment.environment" }
        }
      },
      next: "3",
      lane_id: "1"
    },
    {
      id: "3",
      type: "SystemTask",
      category: "http",
      name: "Http node",
      parameters: {
        input: {
          payload: {
            dummy: { $ref: "environment.payload" },
          },
        },
        request: {
          verb: "POST",
          url: { $ref: "environment.host" },
        },
      },
      next: "4",
      lane_id: "1",
    },
    {
      id: "4",
      type: "ScriptTask",
      name: "Script node",
      parameters: {
        input: {
          threshold: { $ref: "environment.threshold" },
        },
        script: {
          function: [
            "fn",
            ["input", "&", "args"],
            "input",
          ],
        }
      },
      next: "5",
      lane_id: "1"
    },
    {
      id: "5",
      type: "UserTask",
      name: "Start node",
      parameters: {
        input: {
          limit: { $mustache: "O limite é {{environment.threshold}}" },
        },
        action: "refenceEnvironment",
      },
      next: "99",
      lane_id: "1"
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {
    environment: "ENVIRONMENT",
    host: "API_HOST",
    payload: "PAYLOAD",
    threshold: "LIMIT",
  },
};

blueprints_.multiple_starts = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node 1",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "10",
      type: "Start",
      name: "Start node for admin",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "2"
    },
    {
      id: "2",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "1_lane",
      rule: lisp.validate_claim("simpleton"),
    },
    {
      id: "2",
      name: "2_lane",
      rule: lisp.validate_claim("admin"),
    },
  ],
  environment: {},
};

blueprints_.multiple_finish = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "Flow",
      name: "Flow node",
      parameters: {
        input: {
          decision: { $ref: "bag.input" },
        },
      },
      next: {
        value: "98",
        default: "99"
      },
      lane_id: "1",
    },
    {
      id: "98",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    },
    {
      id: "99",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.create_process_minimal = {
  requirements: ["core"],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "Start node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1"
    },
    {
      id: "2",
      type: "SystemTask",
      category: "startProcess",
      name: "Start process node",
      parameters: {
        workflow_name: "minimal",
        input: {},
        actor_data: { $ref: "actor_data" }
      },
      next: "3",
      lane_id: "1"
    },
    {
      id: "3",
      type: "Finish",
      name: "Finish node",
      next: null,
      lane_id: "1"
    }
  ],
  lanes: [
    {
      id: "1",
      name: "the_only_lane",
      rule: lisp.return_true()
    }
  ],
  environment: {},
};

blueprints_.user_timeout = {
  requirements: [],
  prepare: [],
  nodes: [
    {
      id: "1",
      type: "Start",
      name: "start  node",
      parameters: {
        input_schema: {},
      },
      next: "2",
      lane_id: "1",
    },
    {
      id: "2",
      type: "UserTask",
      name: "user task node",
      parameters: {
        action: "example_action",
        input: {},
        timeout: 1,
      },
      next: "99",
      lane_id: "1",
    },
    {
      id: "99",
      type: "Finish",
      name: "finish node",
      next: null,
      lane_id: "1",
    },
  ],
  lanes: [
    {
      id: "1",
      name: "only_lane",
      rule: lisp.return_true(),
    }
  ],
  environment: {},
}

actors_.sys_admin = {
  "actor_id": "1",
  "claims": ["sys_admin", "admin", "simpleton"]
},

  actors_.admin = {
    "actor_id": "2",
    "claims": ["admin", "simpleton"]
  };

actors_.manager = {
  "actor_id": "3",
  "claims": ["manager", "simpleton"]
};

actors_.simpleton = {
  "actor_id": "4",
  "claims": ["simpleton"]
};

module.exports = {
  blueprints_: blueprints_,
  actors_: actors_
};
