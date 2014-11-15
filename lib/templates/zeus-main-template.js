var Template = require('webpack/lib/Template'),
    Client = require('../client');

module.exports = MainTemplate;

function MainTemplate(outputOptions) {
  Template.call(this, outputOptions);
}
MainTemplate.prototype = Object.create(Template.prototype);
MainTemplate.prototype.apply = function(mainTemplate) {
  var includeCssLoader,
      includeJsLoader;

  mainTemplate.plugin('local-vars', function(source, chunk, hash) {
    var self = this,
        filename = this.outputOptions.filename || 'bundle.js',
        chunkFilename = this.outputOptions.chunkFilename || '[id].' + filename,

        installedChunks,
        cssChunkNames = [],
        jsChunkNames = [];

    if(chunk.chunks.length > 0) {
      installedChunks = this.indent(
        chunk.ids.map(function(id) {
          return id + ':0';
        }).join(',\n')
      );
    }

    /*
      Each component needs to maintain a listing of it's internal modules.
      These can be referenced simply with the module number. (Constituent
      chunks within the given module may still be referenced by simple id)

      For external chunks, we utilize the separate loader. This will need
      to be able to access the loaders for distinct modules within the
      system.

      Loaded chunks will also need to access the overarching module loader.

      Might need to define a particular component as the entry point if the
      implementation of the global loader has a lot of overhead. If it does
      not then we should include it in each component and they can delegate
      control to the first loaded. (This might have versioning issues, but
      presumably this will be relatively static and that too can be
      versioned with the rest of it)
    */

    includeJsLoader = includeCssLoader = false;

    (function addChunk(c) {
      if (!c.entry) {
        jsChunkNames[c.id] = self.applyPluginsWaterfall('asset-path', chunkFilename, {
          hash: hash,
          chunk: {
            id: c.id,
            hash: c.renderedHash,
            name: c.name || c.id
          }
        });

        includeJsLoader = true;
      } else {
        jsChunkNames[c.id] = 0;
      }

      if (c.cssChunk) {
        cssChunkNames[c.id] = c.cssChunk.filename;
        includeCssLoader = true;
      }
      c.chunks.forEach(addChunk);
    }(chunk));

    if (includeJsLoader) {
      jsChunkNames = JSON.stringify(jsChunkNames)
    }

    if (includeCssLoader) {
      cssChunkNames = JSON.stringify(cssChunkNames.map(function(name) {
        return this.applyPluginsWaterfall('asset-path', name, {hash: hash});
      }, this))
    }

    return this.asString([
      source,
      '',
      Client.localVars({
        installedChunks: installedChunks,
        jsChunkNames: includeJsLoader && jsChunkNames,
        cssChunkNames: includeCssLoader && cssChunkNames
      })
    ]);
  });
  mainTemplate.plugin('require-ensure', function(/* ensure, chunk, hash */) {
    return Client.jsLoader();
  });
  mainTemplate.plugin('bootstrap', function(source, chunk, hash) {
    if(chunk.chunks.length > 0) {
      var jsonpFunction = this.outputOptions.jsonpFunction || 'zeusJsonp';
      return this.asString([
        source,
        '',
        Client.loaderCallback({
          jsonpFunction: JSON.stringify(jsonpFunction),
          componentId: JSON.stringify(this.outputOptions.component),
          requireFn: this.requireFn,
          addModules: this.renderAddModule(hash, chunk, 'moduleId', 'moreModules[moduleId]'),
          moreModules: this.entryPointInChildren(chunk)
        })
      ]);
    }
    return source;
  });
  mainTemplate.plugin('require-extensions', function(extensions/*, chunk, hash */) {
    var buf = [extensions];

    if (includeCssLoader) {
      buf.push(Client.cssLoader());
    }

    return this.asString(buf);
  });
};
