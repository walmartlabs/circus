var _ = require('lodash');

exports.bootstrapAsset = function(compilation, file) {
  var bootstrap = _.find(compilation.chunks, function(chunk) { return chunk.entry; });

  // Missing shouldn't happen but to be safe. This is a diagnostic change anyway.
  if (bootstrap) {
    bootstrap.files.push(file);
  }
};
