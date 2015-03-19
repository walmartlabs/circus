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
    if (chunk.bootstrap && chunk.chunks.length) {
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

        includeCssLoader,
        ourCssChunks = [],
        ourJsChunks = [],
        cssChunkNames = {},
        jsChunkNames = {};

    (function addChunk(c) {
      c.chunks.forEach(addChunk);
      if (c.bootstrap) {
        return;
      }

      if (!c.initial) {
        ourJsChunks[c.id] = self.applyPluginsWaterfall('asset-path', chunkFilename, {
          hash: hash,
          chunk: {
            id: c.id,
            hash: c.renderedHash,
            name: c.name || c.id
          }
        });
      } else if (c !== chunk) {
        ourJsChunks[c.id] = self.applyPluginsWaterfall('asset-path', filename, {
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
        includeCssLoader = true;
      }
    }(chunk));

    jsChunkNames[this.outputOptions.component] = ourJsChunks;
    cssChunkNames[this.outputOptions.component] = ourCssChunks.map(function(name) {
      return this.applyPluginsWaterfall('asset-path', name, {hash: hash});
    }, this);

    _.each(compiler.options.components, function(component, componentName) {
      var componentJsChunks = [],
          componentCssChunks = [],

          lookup = compiler.options.linker.local ? {} : component.published;

      _.each(component.chunks, function(chunk) {
        componentJsChunks.push(lookup[chunk.js] || chunk.js || 0);
        componentCssChunks.push(lookup[chunk.css] || chunk.css || 0);
        if (chunk.css) {
          includeCssLoader = true;
        }
      });
      jsChunkNames[componentName] = componentJsChunks;
      cssChunkNames[componentName] = componentCssChunks;
    });

    if (bootstrap) {
      var jsonpFunction = this.outputOptions.jsonpFunction || '__webpack_components__';
      bootstrap = Client.bootstrap({
        jsonpFunction: JSON.stringify(jsonpFunction),
        fruitLoops: this.outputOptions.fruitLoops,
        includeCssLoader: includeCssLoader,
        cssChunkNames: JSON.stringify(cssChunkNames),
        jsChunkNames: JSON.stringify(jsChunkNames)
      });
    }

    return this.asString([
      source,
      bootstrap || ''
    ]);
  });
  mainTemplate.plugin('require', function(/* source, chunk, hash */) {
    // We can't strip out the full require method easily so we just omit the content
    // in a simple bootstrap environment.
    return '';
  });
  mainTemplate.plugin('require-ensure', function(/* ensure, chunk, hash */) {
    return '';
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
      } else if (publicPath) {
        buf.push('__webpack_components__.p = ' + JSON.stringify(publicPath) + ';');
      }
    }

    if (!chunk.bootstrap) {
      var jsonpFunction = this.outputOptions.jsonpFunction || '__webpack_components__';
      buf.push('ready(function() {'
            + jsonpFunction
            + '(' + JSON.stringify(this.outputOptions.component)
            + ', ' + JSON.stringify(chunk.ids)
            + ', ' + JSON.stringify(chunk.linkedDeps)
            + ', modules);'
          + '});');
    }

    return this.asString(buf);
  });
};

function includeBootstrap(mainTemplate, chunk) {
  return chunk.bootstrap || mainTemplate.outputOptions.bootstrap;
}
