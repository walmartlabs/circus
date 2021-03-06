var _ = require('lodash'),
    Source = require('webpack-core/lib/Source');

var package = require('../package.json');


function CircusJsonSource(compilation) {
  this.compilation = compilation;
}
module.exports = CircusJsonSource;
CircusJsonSource.prototype = Object.create(Source.prototype);

CircusJsonSource.prototype.source = function() {
  if (this._source) {
    return this._source;
  }

  // Extract all declared routes
  var json = {chunks: [], modules: {}, files: [], published: {}, circusVersion: package.version},
      compilation = this.compilation;

  compilation.chunks.forEach(function(chunk) {
    if (!chunk.bootstrap) {
      json.files.push.apply(json.files, chunk.files);
      json.chunks[chunk.id] = {
        js: chunk.files[0]
      };
    } else {
      json.bootstrap = chunk.files[0];
    }

    if (_.some(chunk.modules, function(module) { return !module.id; })) {
      json.entry = chunk.files[0];

      // Ensure that the entry file is always the first file listed.
      json.files = [chunk.files[0]].concat(_.without(json.files, json.entry));
    }
  });

  compilation.applyPlugins('circus-json', json);

  // Ensure that we don't end up with multiple copies of files
  json.files = _.unique(json.files);

  // Or our manifest files
  json.files = _.without(json.files, 'bower.json', 'circus.json');

  _.defaults(json.published, _.object(json.files, json.files));

  this._source = JSON.stringify(json, undefined, 2);
  return this._source;
};
