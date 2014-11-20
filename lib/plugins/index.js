var CssChunkPlugin = require('./css-chunk'),
    LinkerPlugin = require('./linker'),
    LoaderPlugin = require('./loader'),
    RouterPlugin = require('./router');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var cssChunk = new CssChunkPlugin(),
      linker = new LinkerPlugin(),
      loader = new LoaderPlugin(),
      router = new RouterPlugin();

  cssChunk.apply(compiler);
  linker.apply(compiler);
  loader.apply(compiler);
  router.apply(compiler);
};
