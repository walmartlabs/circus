var Template = require('webpack/lib/Template'),
    fs = require('fs');

var CSS_LOADER = fs.readFileSync(__dirname + '/../client/css-loader.js.template').toString(),
    JS_LOADER = fs.readFileSync(__dirname + '/../client/js-loader.js.template').toString();

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

        cssChunkNames = [],
        jsChunkNames = [];

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
      source = this.asString([
        source,
        'var jsPaths = ' + JSON.stringify(jsChunkNames) + ';'
      ]);
    }

    if (includeCssLoader) {
      source = this.asString([
        source,
        '// The css file cache',
        'var cssSheets = {};',
        'var cssPaths = ' + JSON.stringify(cssChunkNames.map(function(name) {
          return this.applyPluginsWaterfall('asset-path', name, {hash: hash});
        }, this)) + ';'
      ]);
    }

    return source;
  });
  mainTemplate.plugin('require-ensure', function(/* ensure, chunk, hash */) {
    // Completely overriding the ensure implementation with our own
    return this.asString([JS_LOADER]);
  });
  mainTemplate.plugin('require-extensions', function(extensions/*, chunk, hash */) {
    var buf = [extensions];

    if (includeCssLoader) {
      buf.push(CSS_LOADER);
    }

    return this.asString(buf);
  });
};
