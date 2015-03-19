/*global __karma__, __webpack_components__ */
__karma__.loaded = function() {
  function exec() {
    required--;
    if (required <= 0) {
      __karma__.start();
    }
  }

  // If there are any pending webpack components then we want to defer test exec until they are complete
  var required = __webpack_components__.n.length;
  for (var i = 0; i < required; i++) {
    __webpack_components__.lc(__webpack_components__.n[i], function(component) {
      component.e(0, exec);
    });
  }
};
