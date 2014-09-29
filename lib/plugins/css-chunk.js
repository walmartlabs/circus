var ConcatSource = require('webpack-core/lib/ConcatSource'),
    ModuleDependency = require('webpack/lib/dependencies/ModuleDependency'),
    Template = require('webpack/lib/Template');

module.exports = exports = function CssChunkPlugin() {};

exports.prototype.apply = function(compiler) {
  compiler.parser.plugin('call require.css', function(expr) {
    var request = this.evaluateExpression(expr.arguments[0]);
    this.state.current.addDependency(new CssDependency(request.string, this.state.module, expr.range));

    return true;
  });

  compiler.plugin('compilation', function(compilation, params) {
    var normalModuleFactory = params.normalModuleFactory;
    compilation.dependencyFactories.set(CssDependency, new CssDependency.Factory(compilation, normalModuleFactory));
    compilation.dependencyTemplates.set(CssDependency, new CssDependency.Template());

    compilation.dependencyFactories.set(CssContentDependency, normalModuleFactory);

    compilation.plugin('before-chunk-assets', function() {
      var filename = this.outputOptions.filename || "bundle.js";
      var chunkFilename = this.outputOptions.chunkFilename || "[id]." + filename;
      chunkFilename = chunkFilename.replace(/\.js$/, '.css');

      // Find all CSS modules and pull them into an associated css chunk
      this.chunks.forEach(function(chunk) {
        var cssSource = new ConcatSource(),
            foundCss;

        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            if (dependency instanceof CssDependency && dependency.text) {
              cssSource.add(dependency.text);
              foundCss = true;
            }
          });
        });

        if (foundCss) {
          chunk.cssChunk = cssSource;

          // Only calculate our hash here if necessary
          var hash;
          if (Template.REGEXP_CHUNKHASH.test(chunkFilename)) {
            hash = require('crypto').createHash('md5');
            cssSource.updateHash(hash);
            hash = hash.digest('hex');
          }

          // Hash will be updated when that parameter is available. So this does not cause issues,
          // during this phase, we are replacing this with a placeholder. Intermediate steps will
          // need to make sure that they do this update properly themselves
          var hashParams = [];
          chunkFilename = chunkFilename.replace(Template.REGEXP_HASH, function(param) {
            hashParams.push(param);
            return '$h$';
          });

          cssSource.filename = this.mainTemplate.applyPluginsWaterfall('asset-path', chunkFilename, {
            chunk: {
              id: chunk.id,
              hash: hash
            }
          }).replace(/\$h\$/g, function() {
            // Restore the hash paramters so they can be evaluated after the full hash has been calculated
            return hashParams.shift();
          });
        }
      }, this);
    });

    compilation.plugin('additional-assets', function(callback) {
      // Deferring actual "output" of the final files until we have the project level hash
      this.chunks.forEach(function(chunk) {
        if (chunk.cssChunk) {
          chunk.cssChunk.filename = this.mainTemplate.applyPluginsWaterfall('asset-path', chunk.cssChunk.filename, {
            hash: this.hash
          });

          this.assets[chunk.cssChunk.filename] = chunk.cssChunk;
        }
      }, this);

      setImmediate(callback);
    });
  });
};


function CssDependency(request, module, range) {
  ModuleDependency.call(this, request);
  this.Class = CssDependency;

  this.module = module;
  this.range = range;
}
CssDependency.prototype = Object.create(ModuleDependency.prototype);
CssDependency.prototype.type = 'require.css';
CssDependency.prototype.updateHash = function(hash) {
  ModuleDependency.prototype.updateHash.call(this, hash);

  hash.update(this.module.chunks[0].id + '_css');
};

CssDependency.Template = function CssDependencyTemplate() {};
CssDependency.Template.prototype.apply = function(dep, source) {
  source.replace(dep.range[0], dep.range[1]-1, '__webpack_modules__.cs(' + dep.module.chunks[0].id + ')');
};

CssDependency.Factory = function(compilation) {
  this.compilation = compilation;
};
CssDependency.Factory.prototype.create = function(context, dependency, callback) {
  // Load the css content using our own stringifying source loader so we can get the content
  // without js parsing causing errors.
  var loader = new CssContentDependency(__dirname + '/../loaders/stringify!' + dependency.request);

  this.compilation.addModuleDependencies(dependency.module, [[loader]], this.compilation.bail, null, true, function(err) {
    if (loader.module) {
      dependency.text = JSON.parse(loader.module.source().source());

      // Ensure the we rebuild based on the dependencies loaded here
      loader.module.fileDependencies.forEach(function(dep) {
        dependency.module.fileDependencies.push(dep);
      });
    }

    callback(err);
  });
};


function CssContentDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = CssContentDependency;
}
CssContentDependency.prototype = Object.create(ModuleDependency.prototype);
