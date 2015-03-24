/*
  Derived from https://github.com/webpack/file-loader/blob/master/index.js

  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
var loaderUtils = require('loader-utils');
var path = require('path');

module.exports = function(content) {
  this.cacheable && this.cacheable();
  var query = loaderUtils.parseQuery(this.query);
  var url = loaderUtils.interpolateName(this, query.name || '[hash].[ext]', {
    context: query.context || this.options.context,
    content: content,
    regExp: query.regExp
  });

  this.emitResource(url, content);
  return 'module.exports = __webpack_require__.ru/*resolveUrl*/(' + JSON.stringify(url) + ')';
};
module.exports.raw = true;
