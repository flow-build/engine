const packages_ = {};;

packages_.test_package =
    ["do",
    ["def", "test_core_1",
      ["fn", ["&", "args"],
          ["list", {"result": "Result 1"}, {"new_bag": "New Bag 1"}]]],
    ["def", "test_core_2",
      ["fn", ["&", "args"],
          ["list", {"result": "Result 2"}, {"new_bag": "New Bag 2"}]]],
     null
   ];

module.exports = {
  packages_: packages_
};
