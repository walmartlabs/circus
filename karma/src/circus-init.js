/*global __karma__, __webpack_components__ */
__karma__.loaded = function() {
  function exec() {
    required--;
    if (required <= 0) {
      __karma__.start();
    }
  }

  if (typeof __webpack_components__ === 'undefined') {
    window.__webpack_components__ = {};
  }

  // If there are any pending webpack components then we want to defer test exec until they are complete
  var required = 1;
  for (var name in __webpack_components__) {
    if (Array.isArray(__webpack_components__[name])) {
      required++;
      __webpack_components__[name].push(exec);
    }
  }
  exec();
};
