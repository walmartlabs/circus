var CssChunkPlugin = require('./css-chunk'),
    LinkerPlugin = require('./linker'),
    LoaderPlugin = require('./loader'),
    ModuleExportPlugin = require('./module-export');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var cssChunk = new CssChunkPlugin(),
      linker = new LinkerPlugin(),
      loader = new LoaderPlugin(),
      moduleExport = new ModuleExportPlugin();

  cssChunk.apply(compiler);
  linker.apply(compiler);
  loader.apply(compiler);
  moduleExport.apply(compiler);
};
