/*global __karma__, __webpack_components__ */
__karma__.loaded = function() {
  function exec() {
    required--;
    if (required <= 0) {
      __karma__.start();
    }
  }

  // If there are any pending webpack components then we want to defer test exec until they are complete
  var required = 1;
  for (var name in __webpack_components__.c) {
    required++;
    __webpack_components__.c[name].e(0, exec);
  }
  exec();
};
