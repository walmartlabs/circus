function BootstrapPlugin() {
}
module.exports = BootstrapPlugin;

BootstrapPlugin.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    if (compilation.options.output.bootstrap) {
      return;
    }

    compilation.plugin('optimize-chunks', function(chunks) {
      var entry = chunks.filter(function(chunk) { return chunk.entry; });
      /*istanbul ignore if */
      if (entry.length > 1) {
        throw new Error('Multiple entries not supported');
      }

      var bootstrap = this.addChunk('bootstrap');
      bootstrap.initial = bootstrap.entry = true;
      bootstrap.filenameTemplate = 'bootstrap.js';
      bootstrap.bootstrap = entry[0] || true;
    });
  });
};
