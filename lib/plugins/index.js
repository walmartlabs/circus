var CssChunkPlugin = require('./css-chunk'),
    LoaderPlugin = require('./loader'),
    RouterPlugin = require('./router');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var cssChunk = new CssChunkPlugin(),
      loader = new LoaderPlugin(),
      router = new RouterPlugin();

  cssChunk.apply(compiler);
  loader.apply(compiler);
  router.apply(compiler);
};
