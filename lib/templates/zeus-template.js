var MainTemplatePlugin = require('./zeus-main-template'),
    ChunkTemplatePlugin = require('./zeus-chunk-template');

function ZeusTemplatePlugin() {
}
module.exports = ZeusTemplatePlugin;
ZeusTemplatePlugin.prototype.apply = function(compiler) {
  compiler.plugin('this-compilation', function(compilation) {
    compilation.mainTemplate.apply(new MainTemplatePlugin());
    compilation.chunkTemplate.apply(new ChunkTemplatePlugin());
  });
};
