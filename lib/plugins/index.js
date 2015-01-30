var BootstrapPlugin = require('./bootstrap'),
    CssChunkPlugin = require('./css-chunk'),
    LinkerPlugin = require('./linker'),
    ModuleExportPlugin = require('./module-export');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  var bootstrap = new BootstrapPlugin(),
      cssChunk = new CssChunkPlugin(),
      linker = new LinkerPlugin(),
      moduleExport = new ModuleExportPlugin();

  bootstrap.apply(compiler);
  cssChunk.apply(compiler);
  linker.apply(compiler);
  moduleExport.apply(compiler);
};
