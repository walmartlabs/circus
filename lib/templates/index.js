var MainTemplatePlugin = require('./main-template'),
    ChunkTemplatePlugin = require('./chunk-template');

function TemplatePlugin() {
}
module.exports = TemplatePlugin;
TemplatePlugin.prototype.apply = function(compiler) {
  compiler.plugin('this-compilation', function(compilation) {
    compilation.mainTemplate.apply(new MainTemplatePlugin());
    compilation.chunkTemplate.apply(new ChunkTemplatePlugin());
  });
};
