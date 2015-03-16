var _ = require('lodash');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('circus-json', function(json) {
      var componentName = compilation.options.output.component,
          components = compilation.options.components;
      var remapped = {};

      var bootstrap = _.find(compilation.chunks, function(chunk) { return chunk.entry; });

      _.each(json.chunks, function(chunk, id) {
        var newChunk = remapped[componentName + '_' + id] = {
          js: [],
          css: []
        };

        // Include the bootstrap
        insertFile(newChunk.js, bootstrap.files[0], componentName + '_' + bootstrap.id);

        // Include any dependencies that we may have
        _.each(compilation.chunks[id].linkedDeps.reverse(), function(dependency) {
          var componentName = json.components[dependency],
              component = components[componentName];

          var chunk = component.chunks[0];
          insertFile(newChunk.js, resolveFile(chunk.js, component, compiler), componentName + '_0');
          insertFile(newChunk.css, resolveFile(chunk.css, component, compiler), componentName + '_0');
        });

        // CSS content that may be in the bootstrap chunk should still come after dependencies as
        // there is no real concept of bootstrap in css.
        if (bootstrap.cssChunk) {
          insertFile(newChunk.css, bootstrap.cssChunk.filename, componentName + '_' + bootstrap.id);
        }

        // Include our own content
        insertFile(newChunk.js, chunk.js, componentName + '_' + id);
        insertFile(newChunk.css, chunk.css, componentName + '_' + id);
      });

      json.chunkDependencies = remapped;
    });
  });
};

function insertFile(list, href, id) {
  if (href && !_.find(list, function(entry) { return entry.href === href; })) {
    list.push({href: href, id: id});
  }
}

function resolveFile(file, component, compiler) {
  if (!compiler.options.linker.local) {
    return component.published[file] || file;
  } else {
    return file;
  }
}
