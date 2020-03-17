function abstractFactory(class_map_) {
  return function(class_key, ...parameters) {
    const class_map = class_map_;
    const [class_, ..._] = class_map[class_key];
    return new class_(...parameters);
  };
}

module.exports = {
  abstractFactory: abstractFactory,
};
