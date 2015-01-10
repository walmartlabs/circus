var CssChunkPlugin = require('./css-chunk'),
    LinkerPlugin = require('./linker'),
    ModuleExportPlugin = require('./module-export');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var cssChunk = new CssChunkPlugin(),
      linker = new LinkerPlugin(),
      moduleExport = new ModuleExportPlugin();

  cssChunk.apply(compiler);
  linker.apply(compiler);
  moduleExport.apply(compiler);
};
