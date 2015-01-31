var _ = require('lodash'),
    Template = require('webpack/lib/Template'),
    Client = require('../client');

module.exports = MainTemplate;

function MainTemplate(compiler) {
  Template.call(this);
  this.compiler = compiler;
}
MainTemplate.prototype = Object.create(Template.prototype);
MainTemplate.prototype.apply = function(mainTemplate) {
  var compiler = this.compiler;

  mainTemplate.plugin('startup', function(source, chunk/*, hash*/) {
    var buf = [];
    if (chunk.bootstrap) {
      buf.push('');
      buf.push('// Load entry component');
      buf.push('loadComponent(' + JSON.stringify(this.outputOptions.component) + ', function() {});');
    } else {
      return source;
    }
    return this.asString(buf);
  });

  mainTemplate.plugin('local-vars', function(source, chunk, hash) {
    var self = this,
        filename = this.outputOptions.filename || 'bundle.js',
        chunkFilename = this.outputOptions.chunkFilename || '[id].' + filename,
        bootstrap = includeBootstrap(this, chunk),
        localVars,

        ourCssChunks = [],
        ourJsChunks = [],
        cssChunkNames = {},
        jsChunkNames = {};

    (function addChunk(c) {
      if (!c.entry) {
        ourJsChunks[c.id] = self.applyPluginsWaterfall('asset-path', chunkFilename, {
          hash: hash,
          chunk: {
            id: c.id,
            hash: c.renderedHash,
            name: c.name || c.id
          }
        });
      } else {
        ourJsChunks[c.id] = 0;
      }

      if (c.cssChunk) {
        ourCssChunks[c.id] = c.cssChunk.filename;
      }
      c.chunks.forEach(addChunk);
    }(chunk.bootstrap || chunk));

    jsChunkNames[this.outputOptions.component] = ourJsChunks;
    cssChunkNames[this.outputOptions.component] = ourCssChunks.map(function(name) {
      return this.applyPluginsWaterfall('asset-path', name, {hash: hash});
    }, this);

    _.each(compiler.options.components, function(component, componentName) {
      var componentJsChunks = [],
          componentCssChunks = [];
      _.each(component.chunks, function(chunk) {
        if (chunk.js && chunk.js !== component.entry) {
          componentJsChunks.push(chunk.js);
        } else {
          componentJsChunks.push(0);
        }
        componentCssChunks.push(chunk.css || 0);
      });
      jsChunkNames[componentName] = componentJsChunks;
      cssChunkNames[componentName] = componentCssChunks;
    });

    if (bootstrap) {
      bootstrap = Client.bootstrap({
        cssChunkNames: JSON.stringify(cssChunkNames),
        jsChunkNames: JSON.stringify(jsChunkNames),
        exportAMD: this.outputOptions.exportAMD
      });
    }

    if (!chunk.bootstrap) {
      localVars = Client.localVars({
        componentName: JSON.stringify(this.outputOptions.component),
      });
    }

    return this.asString([
      source,
      bootstrap || '',
      localVars || ''
    ]);
  });
  mainTemplate.plugin('require', function(source, chunk/*, hash */) {
    if (chunk.bootstrap) {
      // We can't strip out the full require method easily so we just omit the content
      // in a simple bootstrap environment.
      return '';
    } else {
      return 'return __webpack_components__.r(' + this.requireFn + ', thisComponent, moduleId);';
    }
  });
  mainTemplate.plugin('require-ensure', function(/* ensure, chunk, hash */) {
    return Client.jsLoader();
  });
  mainTemplate.plugin('bootstrap', function(source, chunk/*, hash */) {
    if (chunk.bootstrap || this.outputOptions.bootstrap) {
      var jsonpFunction = this.outputOptions.jsonpFunction || 'zeusJsonp';
      return this.asString([
        source,
        '',
        Client.loaderCallback({
          jsonpFunction: JSON.stringify(jsonpFunction),
          exportAMD: this.outputOptions.exportAMD
        })
      ]);
    }
    return source;
  });
  mainTemplate.plugin('require-extensions', function(extensions, chunk/*, hash */) {
    var buf = [];

    if (includeBootstrap(this, chunk)) {
      var publicPath = this.outputOptions.publicPath || "";
      publicPath = this.applyPluginsWaterfall("asset-path", publicPath, {});
      /*istanbul ignore else : too many tests! */
      if (!publicPath && !this.outputOptions.fruitLoops) {
        buf.push(
          'if (!__webpack_components__.p) {',
          this.indent([
            'var script = document.querySelector(\'[data-circus-jsid=' + JSON.stringify(this.outputOptions.component + '_0') + ']\');',
            'script = script && script.getAttribute("src");',
            'if (script && script.indexOf("/") >= 0) {',
            this.indent('__webpack_components__.p = script.replace(/\\/[^\\/]*$/, "/");'),
            '}'
          ]),
          '}');
      }
    }

    if (!chunk.bootstrap) {
      buf.push(extensions);

      buf.push(Client.cssLoader({
        fruitLoops: this.outputOptions.fruitLoops
      }));
    }

    return this.asString(buf);
  });
};

function includeBootstrap(mainTemplate, chunk) {
  return chunk.bootstrap || mainTemplate.outputOptions.bootstrap;
}
