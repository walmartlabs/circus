var CssChunkPlugin = require('./css-chunk'),
    LinkerPlugin = require('./linker'),
    LoaderPlugin = require('./loader');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var cssChunk = new CssChunkPlugin(),
      linker = new LinkerPlugin(),
      loader = new LoaderPlugin();

  cssChunk.apply(compiler);
  linker.apply(compiler);
  loader.apply(compiler);
};
