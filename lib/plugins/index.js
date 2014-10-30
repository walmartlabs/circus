var CssChunkPlugin = require('./css-chunk'),
    LoaderPlugin = require('./loader'),
    MainTemplate = require('../templates/main-template'),
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

  compiler.plugin('compilation', function(compilation) {
    compilation.mainTemplate.apply(new MainTemplate());
  });
};
