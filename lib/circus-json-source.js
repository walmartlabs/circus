var _ = require('lodash'),
    Source = require('webpack-core/lib/Source'),

    RequireRouterListing = require('./dependencies/require-router-listing');


function CircusJsonSource(compilation, router) {
  this.compilation = compilation;
  this.router = router;
}
module.exports = CircusJsonSource;
CircusJsonSource.prototype = Object.create(Source.prototype);

CircusJsonSource.prototype._bake = function() {
  // Extract all declared routes
  var json = {chunks: [], modules: {}, routes: {}, files: []},
      compilation = this.compilation,
      router = this.router;

  compilation.chunks.forEach(function(chunk) {
    var chunkHasLoader;

    json.files.push.apply(json.files, chunk.files);
    json.chunks[chunk.id] = {
      js: chunk.files[0]
    };

    if (chunk.entry) {
      json.entry = chunk.files[0];

      // Ensure that the entry file is always the first file listed.
      json.files = [chunk.files[0]].concat(_.without(json.files, json.entry));
    }

    if (chunk.cssChunk) {
      json.files.push(chunk.cssChunk.filename);
      json.chunks[chunk.id].css = chunk.cssChunk.filename;
    }

    chunk.modules.forEach(function(module) {
      var name = module.externalName;
      if (name) {
        json.modules[module.id] = {
          chunk: chunk.id,
          name: name
        };
      }

      module.dependencies.forEach(function(dependency) {
        // Only collect routes for modules explicitly loaded via a loader call
        if (dependency instanceof RequireRouterListing) {
          // Warn if multiple instances of a loader occur in a given module. This can
          // lead to some interesting behaviors with conflicting urls that we want to
          // avoid.
          if (chunkHasLoader) {
            compilation.warnings.push(new Error(
                dependency.resource + ':' + dependency.expr.loc.start.line
                + ' - ' + compilation.options.circusNamespace + '.loader used multiple times in one chunk.'));
          }
          chunkHasLoader = true;

          // Iterate over everything that is bundled and output it to our map structure
          dependency.blocks.forEach(function(block) {
            var module = block.dependencies[0].module || {},
                routeMap = router.routeMap[module.resource];
            if (!routeMap) {
              return;
            }

            RequireRouterListing.extractMap(module, block, routeMap, json);
          });
        }
      });
    });
  });

  return {
    source: JSON.stringify(json, undefined, 2)
  };
};
