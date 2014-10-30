var Template = require('webpack/lib/Template');

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
    return this.asString([
      'if (installedChunks[chunkId] === 0) {',
      this.indent('return callback.call(null, __webpack_require__);'),
      '}',

      '// an array means "currently loading".',
      'if(installedChunks[chunkId] !== undefined) {',
      this.indent('installedChunks[chunkId].push(callback);'),
      '} else {',
      this.indent([
        '// start chunk loading',
        'installedChunks[chunkId] = [callback];',
        'var head = document.getElementsByTagName("head")[0];',
        'var script = document.createElement("script");',
        'script.type = "text/javascript";',
        'script.charset = "utf-8";',
        'script.src = __webpack_require__.p + jsPaths[chunkId];',
        'head.appendChild(script);'
      ]),
      '}'
    ]);
  });
  mainTemplate.plugin('require-extensions', function(extensions/*, chunk, hash */) {
    /*global cssPaths, cssSheets */
    var buf = [extensions];

    if (includeCssLoader) {
      buf.push('');
      buf.push('// Expose the css loader');

      /* istanbul ignore next */
      buf.push('__webpack_require__.cs = ' + Template.getFunctionContent(function(chunkId) {
        if (cssSheets[chunkId] || !cssPaths[chunkId]) {
          return cssSheets[chunkId];
        }

        var styleElement = cssSheets[chunkId] = document.createElement('link');
        styleElement.rel = 'stylesheet';
        styleElement.type = 'text/css';
        styleElement.href = cssPaths[chunkId];

        var head = document.getElementsByTagName('head')[0];
        head.appendChild(styleElement);
        return cssSheets[chunkId];
      }));
      buf.push('};');
    }

    return this.asString(buf);
  });
};
