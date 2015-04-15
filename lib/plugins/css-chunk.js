var _ = require('lodash'),
    ConcatSource = require('webpack-core/lib/ConcatSource'),
    OriginalSource = require('webpack-core/lib/OriginalSource'),
    Module = require('module'),
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
    compilation.dependencyFactories.set(CssDependency, new CssDependency.Factory(compilation));
    compilation.dependencyTemplates.set(CssDependency, new CssDependency.Template());

    compilation.dependencyFactories.set(CssContentDependency, normalModuleFactory);
    compilation.dependencyFactories.set(CssAssetDependency, normalModuleFactory);

    compilation.plugin('before-chunk-assets', function() {
      var filename = this.outputOptions.filename || 'bundle.js';
      var chunkFilename = this.outputOptions.chunkFilename || '[id].' + filename;
      chunkFilename = chunkFilename.replace(/\.js$/, '.css');

      // Hash will be updated when that parameter is available. So this does not cause issues,
      // during this phase, we are replacing this with a placeholder. Intermediate steps will
      // need to make sure that they do this update properly themselves
      var hashParams = [];
      chunkFilename = chunkFilename.replace(Template.REGEXP_HASH, function(param) {
        hashParams.push(param);
        return '$h$';
      });

      // Find all CSS modules and pull them into an associated css chunk
      this.chunks.forEach(function(chunk) {
        var cssSource = new ConcatSource(),
            foundCss;

        cssSource.externalFiles = [];

        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            if (dependency instanceof CssDependency && dependency.text) {
              var replacements = {},
                  externalFiles = [];

              _.each(dependency.children, function(child) {
                // If we've errored out, then don't mask the root error
                /*istanbul ignore if */
                if (!child.module || child.module.error) {
                  return;
                }

                // LOOK AWAY! Doing a nasty hack here to resolve the proper url from the compiled
                // module at build time.
                var m = new Module(child.resource, module),
                    src = child.module.source(compilation.dependencyTemplates, compilation.options.output).source();
                src = src.replace(/__webpack_require__.p\b/g, '""').replace(/__webpack_require__.ru/, '(function(url) { return url; })');
                m.filename = child.resource;
                m._compile(src, child.resource);

                var assetUrl = m.exports;
                /*istanbul ignore if: sanity code */
                if (!assetUrl) {
                  compilation.errors.push(new Error(child.resource + ' loaded without exporting url/data'));
                }

                // Check to see if this particular asset is published by one of the components that we are
                var published = !compiler.options.linker.local && _.reduce(compilation.options.components, function(prev, component) {
                  return prev || component.published[assetUrl];
                }, undefined);
                if (published) {
                  // We were published, remap to use that and do not output our file.
                  replacements[child.asset] = published;
                  delete child.module.assets[assetUrl];
                } else {
                  replacements[child.asset] = assetUrl;
                  externalFiles.push(assetUrl);
                }
              });

              dependency.text = dependency.text.replace(/%CSSURL\[(\d+)\]CSSURL%/g, function($0, id) {
                return replacements[id];
              });

              cssSource.add(new OriginalSource(dependency.text, dependency.request));
              cssSource.externalFiles = cssSource.externalFiles.concat(externalFiles);

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

          var hashParam = 0;
          cssSource.filename = this.mainTemplate.applyPluginsWaterfall('asset-path', chunkFilename, {
            chunk: {
              id: chunk.id,
              hash: hash
            }
          }).replace(/\$h\$/g, function() {
            // Restore the hash paramters so they can be evaluated after the full hash has been calculated
            return hashParams[hashParam++];
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
          chunk.files.push(chunk.cssChunk.filename);

          // Filter the recorded file list to those that have been output on this build cycle.
          // This avoids errors when source maps have been enabled and a rebuild occurs.
          chunk.files.push.apply(chunk.files, _.intersection(chunk.cssChunk.externalFiles, Object.keys(this.assets)));
        }
      }, this);

      setImmediate(callback);
    });

    compilation.plugin('circus-json', function(json) {
      compilation.chunks.forEach(function(chunk) {
        if (chunk.cssChunk) {
          json.chunks[chunk.id].css = chunk.cssChunk.filename;

          json.files.push(chunk.cssChunk.filename);
          json.files.push.apply(json.files, chunk.cssChunk.externalFiles);
        }
      });
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

  hash.update(this.chunkId() + '_css');
};

CssDependency.prototype.chunkId = function() {
  /*jshint boss:true */
  // We need to cache this value as module/chunk will go away in watch cycles so we
  // need to ensure that we have it safed for future usage.
  return this._chunkId = this._chunkId != null ? this._chunkId : this.module.chunks[0].id;
};

CssDependency.Template = function CssDependencyTemplate() {};
CssDependency.Template.prototype.apply = function(dep, source) {
  source.replace(dep.range[0], dep.range[1] - 1, '__webpack_require__.cs(' + dep.chunkId() + ')');
};

CssDependency.Factory = function(compilation) {
  this.compilation = compilation;
};
CssDependency.Factory.prototype.create = function(context, dependency, callback) {
  // Load the css content using our own stringifying source loader so we can get the content
  // without js parsing causing errors.
  var loader = new CssContentDependency(__dirname + '/../loaders/raw-css-loader!' + dependency.request);

  var compilation = this.compilation;

  if (!dependency.module) {
    return callback();
  }

  // Load and insert the css into the module
  this.compilation.addModuleDependencies(dependency.module, [[loader]], this.compilation.bail, null, true, function rebuild(err) {
    var children = [];
    if (!err && loader.module) {
      // Handle race conditions where the build may request a dependency while it's still building.
      /*istanbul ignore next */
      if (loader.module.building) {
        return compilation.buildModule(loader.module, rebuild);
      }

      // Ensure the we rebuild based on the dependencies loaded here
      loader.module.fileDependencies.forEach(function(dep) {
        dependency.module.fileDependencies.push(dep);
      });

      /*istanbul ignore else */
      if (!loader.module.error) {
        // For some reason we need to double encode... so double decode (wtf...)
        var source = JSON.parse(JSON.parse(loader.module.source().source()));
        dependency.text = source.source;

        children = _.map(source.modules, function(child) {
          return [new CssAssetDependency(child.id, child.request)];
        });
      }
    }

    if (children.length) {
      compilation.addModuleDependencies(loader.module, children, compilation.bail, null, true, function(err) {
        dependency.children = _.flatten(children, true);
        callback(err);
      });
    } else {
      callback(err);
    }
  });
};


function CssContentDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = CssContentDependency;
}
CssContentDependency.prototype = Object.create(ModuleDependency.prototype);

function CssAssetDependency(asset, request) {
  ModuleDependency.call(this, request);
  this.Class = CssAssetDependency;
  this.asset = asset;
}
CssAssetDependency.prototype = Object.create(ModuleDependency.prototype);
