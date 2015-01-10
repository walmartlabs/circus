var _ = require('lodash'),
    Source = require('webpack-core/lib/Source');


function CircusJsonSource(compilation) {
  this.compilation = compilation;
}
module.exports = CircusJsonSource;
CircusJsonSource.prototype = Object.create(Source.prototype);

CircusJsonSource.prototype._bake = function() {
  // Extract all declared routes
  var json = {chunks: [], modules: {}, files: [], published: {}},
      compilation = this.compilation;

  compilation.chunks.forEach(function(chunk) {
    json.files.push.apply(json.files, chunk.files);
    json.chunks[chunk.id] = {
      js: chunk.files[0]
    };

    if (chunk.entry) {
      json.entry = chunk.files[0];

      // Ensure that the entry file is always the first file listed.
      json.files = [chunk.files[0]].concat(_.without(json.files, json.entry));
    }
  });

  compilation.applyPlugins('circus-json', json);

  // Ensure that we don't end up with multiple copies of files
  json.files = _.unique(json.files);
  _.defaults(json.published, _.object(json.files, json.files));

  return {
    source: JSON.stringify(json, undefined, 2)
  };
};
