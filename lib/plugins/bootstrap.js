var _ = require('lodash');

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

      var bootstrap = this.addChunk('bootstrap');
      bootstrap.initial = bootstrap.entry = true;
      bootstrap.filenameTemplate = 'bootstrap.js';
      bootstrap.bootstrap = true;

      _.each(entry, function(entry) {
        entry.entry = false;
        entry.addParent(bootstrap);
        bootstrap.addChunk(entry);
      });
    });

    // Strip out the bootstrap id from ids list. It's not clear what this
    // does other than provide a display value within webpack status and
    // it adds overhead when generating the installed chunks list.
    compilation.plugin('after-optimize-chunk-ids', function(chunks) {
      var bootstrap = _.find(chunks, function(chunk) { return chunk.entry; });

      _.each(chunks, function(chunk) {
        if (chunk !== bootstrap) {
          chunk.ids = _.difference(chunk.ids, bootstrap.ids);
        }
      });
    });
  });
};
