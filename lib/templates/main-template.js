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
        jsChunkNames = [],
        moduleExports = {},
        moduleChunks = [];

    if (chunk.chunks.length > 0) {
      installedChunks = this.indent(
        chunk.ids.map(function(id) {
          return id + ':0';
        }).join(',\n')
      );
    }

    includeJsLoader = includeCssLoader = false;

    (function addChunk(c) {
      moduleExports[self.outputOptions.component] = 0;
      c.modules.forEach(function(module) {
        if (module.externalName) {
          moduleExports[module.externalName] = module.id;
          moduleChunks[module.id] = c.id;
        }
      });

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
      jsChunkNames = JSON.stringify(jsChunkNames);
    }

    if (includeCssLoader) {
      cssChunkNames = JSON.stringify(cssChunkNames.map(function(name) {
        return this.applyPluginsWaterfall('asset-path', name, {hash: hash});
      }, this));
    }

    return this.asString([
      source,
      '',
      Client.localVars({
        requireFn: this.requireFn,
        installedChunks: installedChunks,
        includeJsLoader: includeJsLoader,
        jsChunkNames: jsChunkNames,
        cssChunkNames: includeCssLoader && cssChunkNames,
        moduleExports: JSON.stringify(moduleExports),
        moduleChunks: JSON.stringify(moduleChunks),

        exportAMD: this.outputOptions.exportAMD,
        exports: JSON.stringify(this.outputOptions.component)
      })
    ]);
  });
  mainTemplate.plugin('require', function(source/*, chunk, hash */) {
    return this.asString([
      'if (moduleExports[moduleId] != null) {',
        this.indent('moduleId = moduleExports[moduleId];'),
      '}',
      source
    ]);
  });
  mainTemplate.plugin('require-ensure', function(/* ensure, chunk, hash */) {
    return Client.jsLoader();
  });
  mainTemplate.plugin('bootstrap', function(source, chunk, hash) {
    if (chunk.chunks.length > 0) {
      var jsonpFunction = this.outputOptions.jsonpFunction || 'zeusJsonp';
      return this.asString([
        source,
        '',
        Client.loaderCallback({
          jsonpFunction: JSON.stringify(jsonpFunction),
          exportAMD: this.outputOptions.exportAMD,
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

    var publicPath = this.outputOptions.publicPath || "";
    publicPath = this.applyPluginsWaterfall("asset-path", publicPath, {});
    if (!publicPath) {
      buf.push('if (!' + this.requireFn + '.p) {');
      buf.push(this.indent([
        'var script = document.querySelector(\'[data-circus-entry=' + JSON.stringify(this.outputOptions.component) + ']\');',
        'script = script && script.getAttribute("src");',
        'if (script && script.indexOf("/") >= 0) {',
        this.indent(this.requireFn + '.p = script.replace(/\\/[^\\/]*$/, "/");'),
        '}'
      ]));
      buf.push('}');
    }

    if (includeCssLoader) {
      buf.push(Client.cssLoader());
    }

    return this.asString(buf);
  });
};
