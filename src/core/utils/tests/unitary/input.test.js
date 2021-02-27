const { prepare } = require("../../input");
const miniMAL = require("minimal-lisp");
const crypto_manager = require("../../../crypto_manager");

describe("prepare", () => {
    describe("$mustache", () => {
        it("mustache simple", () => {
            const source = {
                $mustache: "Fullname {{bag.name}}"
            };
            const bag = {
                name: 'exampleName'
            }
            const result = prepare(source, { bag });
            expect(result).toEqual("Fullname exampleName");
        });

        it("mustache method use", () => {
            const source = {
                $mustache: "Fullname {{bag.values.length}}"
            };
            const bag = {
                values: [
                    '22'
                ]
            }
            const result = prepare(source, { bag });
            expect(result).toEqual("Fullname 1");
        });

        it("mustache array access by index", () => {
            const source = {
                $mustache: "Fullname {{bag.values.0}}"
            };
            const bag = {
                values: [
                    '22'
                ]
            }
            const result = prepare(source, { bag });
            expect(result).toEqual("Fullname 22");
        });

        it("mustache missing value", () => {
            const source = {
                $mustache: "Fullname {{bag.firstName}}"
            };
            const bag = {
                name: 'exampleName'
            }
            const result = prepare(source, { bag });
            expect(result).toEqual("Fullname ");
        })
    });

    describe("$js", () => {
        it("javascript simple", () => {
            const source = {
                $js: "() => 2 + 2"
            };
            const result = prepare(source);
            expect(result).toEqual(4);
        });

        it("javascript try change bag", () => {
            const source = {
                $js: "({bag}) => {bag.value = 0; return 0;}"
            };
            const bag = {
                value: 99,
            };
            const result = prepare(source, { bag });
            expect(result).toEqual(0);
            expect(bag.value).toEqual(99);
        });

        it("javascript code with bag usage", () => {
            const source = {
                $js: "({bag}) => bag.value + 1"
            };
            const bag = {
                value: 99
            }
            const result = prepare(source, { bag });
            expect(result).toEqual(100);
        });
    });

    describe("$minimal", () => {
        let interpreters;
        beforeEach(() => {
            const m = miniMAL(global);
            m.eval(["do",

                ["def", "new", ["fn", ["a", "&", "b"],
                    [".", "Reflect", ["`", "construct"], "a", "b"]]],
                ["def", "del", ["fn", ["a", "b"],
                    [".", "Reflect", ["`", "deleteProperty"], "a", "b"]]],
                ["def", "map", ["fn", ["a", "b"],
                    [".", "b", ["`", "map"], ["fn", ["x"], ["a", "x"]]]]],
                ["def", "list", ["fn", ["&", "a"], "a"]],
                ["def", ">=", ["fn", ["a", "b"],
                    ["if", ["<", "a", "b"], false, true]]],
                ["def", ">", ["fn", ["a", "b"],
                    ["if", [">=", "a", "b"],
                        ["if", ["=", "a", "b"], false, true],
                        false]]],
                ["def", "<=", ["fn", ["a", "b"],
                    ["if", [">", "a", "b"], false, true]]],

                ["def", "classOf", ["fn", ["a"],
                    [".", [".-", [".-", "Object", ["`", "prototype"]], ["`", "toString"]],
                        ["`", "call"], "a"]]],

                ["def", "not", ["fn", ["a"], ["if", "a", false, true]]],

                ["def", "null?", ["fn", ["a"], ["=", null, "a"]]],
                ["def", "true?", ["fn", ["a"], ["=", true, "a"]]],
                ["def", "false?", ["fn", ["a"], ["=", false, "a"]]],
                ["def", "string?", ["fn", ["a"],
                    ["if", ["=", "a", null],
                        false,
                        ["=", ["`", "String"],
                            [".-", [".-", "a", ["`", "constructor"]],
                                ["`", "name"]]]]]],

                ["def", "pr-str", ["fn", ["&", "a"],
                    [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"],
                        ["`", "join"], ["`", " "]]]],
                ["def", "str", ["fn", ["&", "a"],
                    [".", ["map", ["fn", ["x"],
                        ["if", ["string?", "x"],
                            "x",
                            [".", "JSON", ["`", "stringify"], "x"]]],
                        "a"],
                        ["`", "join"], ["`", ""]]]],
                ["def", "prn", ["fn", ["&", "a"],
                    ["do", [".", "console", ["`", "log"],
                        [".", ["map", [".-", "JSON", ["`", "stringify"]], "a"],
                            ["`", "join"], ["`", " "]]],
                        null]]],
                ["def", "println", ["fn", ["&", "a"],
                    ["do", [".", "console", ["`", "log"],
                        [".", ["map", ["fn", ["x"],
                            ["if", ["string?", "x"],
                                "x",
                                [".", "JSON", ["`", "stringify"], "x"]]],
                            "a"],
                            ["`", "join"], ["`", " "]]],
                        null]]],

                ["def", "list?", ["fn", ["a"],
                    [".", "Array", ["`", "isArray"], "a"]]],
                ["def", "contains?", ["fn", ["a", "b"],
                    [".", "a", ["`", "hasOwnProperty"], "b"]]],
                ["def", "get", ["fn", ["a", "b"],
                    ["if", ["contains?", "a", "b"], [".-", "a", "b"], null]]],
                ["def", "set", ["fn", ["a", "b", "c"],
                    ["do", [".-", "a", "b", "c"], "a"]]],
                ["def", "keys", ["fn", ["a"],
                    [".", "Object", ["`", "keys"], "a"]]],
                ["def", "vals", ["fn", ["a"],
                    [".", "Object", ["`", "values"], "a"]]],

                ["def", "cons", ["fn", ["a", "b"],
                    [".", ["`", []],
                        ["`", "concat"], ["list", "a"], "b"]]],
                ["def", "concat", ["fn", ["&", "a"],
                    [".", [".-", ["list"], ["`", "concat"]],
                        ["`", "apply"], ["list"], "a"]]],
                ["def", "nth", "get"],
                ["def", "first", ["fn", ["a"],
                    ["if", [">", [".-", "a", ["`", "length"]], 0],
                        ["nth", "a", 0],
                        null]]],
                ["def", "last", ["fn", ["a"],
                    ["nth", "a", ["-", [".-", "a", ["`", "length"]], 1]]]],
                ["def", "count", ["fn", ["a"],
                    [".-", "a", ["`", "length"]]]],
                ["def", "empty?", ["fn", ["a"],
                    ["if", ["list?", "a"],
                        ["=", 0, [".-", "a", ["`", "length"]]],
                        ["=", "a", null]]]],
                ["def", "slice", ["fn", ["a", "b", "&", "end"],
                    [".", "a", ["`", "slice"], "b",
                        ["if", [">", [".-", "end", ["`", "length"]], 0],
                            ["get", "end", 0],
                            [".-", "a", ["`", "length"]]]]]],
                ["def", "rest", ["fn", ["a"], ["slice", "a", 1]]],

                ["def", "apply", ["fn", ["f", "&", "b"],
                    [".", "f", ["`", "apply"], "f",
                        ["concat", ["slice", "b", 0, -1], ["last", "b"]]]]],

                ["def", "and", ["~", ["fn", ["&", "xs"],
                    ["if", ["empty?", "xs"],
                        true,
                        ["if", ["=", 1, [".-", "xs", ["`", "length"]]],
                            ["first", "xs"],
                            ["list", ["`", "let"], ["list", ["`", "__and"], ["first", "xs"]],
                                ["list", ["`", "if"], ["`", "__and"],
                                    ["concat", ["`", ["and"]], ["rest", "xs"]],
                                    ["`", "__and"]]]]]]]],

                ["def", "or", ["~", ["fn", ["&", "xs"],
                    ["if", ["empty?", "xs"],
                        null,
                        ["if", ["=", 1, [".-", "xs", ["`", "length"]]],
                            ["first", "xs"],
                            ["list", ["`", "let"], ["list", ["`", "__or"], ["first", "xs"]],
                                ["list", ["`", "if"], ["`", "__or"],
                                    ["`", "__or"],
                                    ["concat", ["`", ["or"]], ["rest", "xs"]]]]]]]]],

                null
            ]);
            interpreters = {
                $minimal: m
            }
        });

        it("minimal simple", () => {
            const source = {
                $minimal: ["+", 2, 2]
            };
            const result = prepare(source, {}, interpreters);
            expect(result).toEqual(4);
        });

        it("minimal code with bag usage", () => {
            const source = {
                $minimal: ["+", ["get", "bag", ["`", "value"]], 1]
            };
            const bag = {
                value: 99,
                string: "st",
            }
            const result = prepare(source, { bag }, interpreters);
            expect(result).toEqual(100);
        });

        it("minimal code with bag usage of strings", () => {
            const source = {
                $minimal: ["+", ["get", "bag", ["`", "string"]], ["`", "ring"]]
            };
            const bag = {
                value: 99,
                string: "st",
            }
            const result = prepare(source, { bag }, interpreters);
            expect(result).toEqual("string");
        });
    });

    describe("$decrypt", () => {
        describe("default crypto", () => {
            beforeAll(() => {
                const crypto = crypto_manager.buildCrypto("", { key: "12345678901234567890123456789012" });
                crypto_manager.setCrypto(crypto);
            });

            afterAll(() => {
                crypto_manager.setCrypto();
            });

            test("simple decrypt reference", () => {
                const source = {
                    $decrypt: "bag.value",
                };

                const crypto = crypto_manager.getCrypto();
                const value = "example of value to be encrypted";
                const encrypted_value = crypto.encrypt(value);
                const bag = {
                    value: encrypted_value
                };

                const result = prepare(source, { bag });
                expect(result).toEqual(value);
            });
        });
    });

    describe("$map", () => {
        it("map a fixed array", () => {
            const source = {
                $map: {
                    array: [
                        {
                            id: "22"
                        },
                        {
                            id: 33
                        },
                        {
                            id: null
                        },
                        {
                        },
                        22
                    ],
                    value: {
                        $ref: "id"
                    }
                }
            };
            const bag = {}
            const result = prepare(source, { bag });
            expect(result).toEqual(["22", 33, null, undefined, undefined]);
        });

        it("map a array from $js", () => {
            const source = {
                $map: {
                    array: { $js: "({bag}) => bag.users" },
                    value: {
                        $ref: "id"
                    }
                }
            };
            const bag = {
                users: [
                    {
                        id: "22"
                    },
                    {
                        id: 33
                    },
                    {
                        id: null
                    },
                    {
                    },
                    22
                ]
            }
            const result = prepare(source, { bag });
            expect(result).toEqual(["22", 33, null, undefined, undefined]);
        });

        it("map array object to array string using $ref", () => {
            const source = {
                $map: {
                    array: { $ref: "bag.users" },
                    value: {
                        $ref: "id"
                    }
                }
            };
            const bag = {
                users: [
                    {
                        id: "22"
                    },
                    {
                        id: 33
                    },
                    {
                        id: null
                    },
                    {
                    },
                    22
                ]
            }
            const result = prepare(source, { bag });
            expect(result).toEqual(["22", 33, null, undefined, undefined]);
        });

        it("map array object to object using $ref, $mustache, fixed value", () => {
            const source = {
                $map: {
                    array: { $ref: "bag.users" },
                    value: {
                        id: {
                            $ref: "id"
                        },
                        fullName: {
                            $mustache: "{{first_name}} {{last_name}}"
                        },
                        value: 3000,
                        valid: true,
                        status: "new",
                    }
                }
            };
            const bag = {
                users: [
                    {
                        id: "22",
                        first_name: "Jose",
                        last_name: "Faria"
                    },
                    {
                        id: 33,
                        first_name: "Maria"
                    },
                    {
                        last_name: "Silva"
                    }
                ]
            }
            const result = prepare(source, { bag });
            expect(result).toEqual([
                {
                    id: "22",
                    fullName: "Jose Faria",
                    value: 3000,
                    valid: true,
                    status: "new",
                },
                {
                    id: 33,
                    fullName: "Maria ",
                    value: 3000,
                    valid: true,
                    status: "new",
                },
                {
                    id: undefined,
                    fullName: " Silva",
                    value: 3000,
                    valid: true,
                    status: "new",
                },
            ]);
        });

        it("returns the value if 'array' do not reference a array", () => {
            const source = {
                $map: {
                    array: { $ref: "bag.data" },
                    value: {
                        $ref: "id"
                    }
                }
            };
            const bag = {
                data: {
                    users: [
                        {
                            id: "22"
                        }
                    ]
                }
            }
            const result = prepare(source, { bag });
            expect(result).toEqual({
                users: [
                    {
                        id: "22"
                    }
                ]
            });
        });
    });
})
