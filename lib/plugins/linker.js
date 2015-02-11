var _ = require('lodash'),
    Async = require('async'),
    ModuleDependency = require('webpack/lib/dependencies/ModuleDependency'),
    NullFactory = require('webpack/lib/NullFactory'),
    Path = require('path'),
    RawSource = require('webpack-core/lib/RawSource'),

    Client = require('../client');

module.exports = exports = function LinkerPlugin() {
  this.usedModules = [];
  this.componentIdCounter = 0;
};

exports.prototype.apply = function(compiler) {
  var plugin = this;

  var linkedModules = {};

  // Convert the components list to the format that we will use for linking/serializing
  _.each(compiler.options.components, function(component, componentName) {
    _.each(component.modules, function(module, moduleId) {
      linkedModules[module.name.toLowerCase()] = {
        name: module.name,
        componentName: componentName,
        entry: compiler.options.linker.local ? component.entry : component.published[component.entry]
      };
      if (moduleId === '0' && !linkedModules[componentName]) {
        linkedModules[componentName] = linkedModules[module.name];
      }
    });
  });

  compiler.plugin('compilation', function(compilation) {
    compilation.dependencyFactories.set(LinkedRequireDependency, new NullFactory());
    compilation.dependencyTemplates.set(LinkedRequireDependency, new LinkedRequireDependencyTemplate());
    compilation.dependencyFactories.set(LinkedBlockDependency, new NullFactory());
    compilation.dependencyTemplates.set(LinkedBlockDependency, new LinkedBlockDependencyTemplate());

    compilation.mainTemplate.plugin('bootstrap', function(extensions, chunk/*, hash*/) {
      var buf = [extensions],
          self = this;

      var linkedModules = [],
          componentNames = [];

      plugin.usedModules.forEach(function(used, index) {
        /* jscs:disable */
        linkedModules[index] = {c/*omponent*/: used.componentId, n/*ame*/: used.name};
        componentNames[used.componentId] = used.componentName;

        // Provide a heads up that things are going to fail
        if (!used.entry) {
          compilation.errors.push(new Error('Component "' + used.componentName + '" referenced and missing entry chunk path'));
        }
      });

      var exports = calcExports(compilation, chunk, self.outputOptions.component, compiler.options.components);

      if (chunk.bootstrap || this.outputOptions.bootstrap) {
        if (!compiler.options.linker.local) {
          _.each(exports.componentPaths, function(entry, componentName) {
            var component = compiler.options.components[componentName];
            if (component) {
              exports.componentPaths[componentName] = component.published[entry];
            }
          });
        }

        buf.push(
          '// Maps friendly module names to internal names for exports\n',
          '// This must be defined in the bootstrap to properly support AMD loading.\n',
          'var componentPaths = ' + JSON.stringify(exports.componentPaths) + ',',
          '    moduleExports = ' + JSON.stringify(exports.moduleExports) + ',',
          '    moduleChunks = ' + JSON.stringify(exports.moduleChunks) + ';');
      }
      if (plugin.usedModules.length && !chunk.bootstrap) {
        buf.push(
          '// Linker variables',
          'var linkedModules = ' + JSON.stringify(linkedModules) + ',',
          '    componentNames = ' + JSON.stringify(componentNames) + ';');
      }

      if (!chunk.bootstrap) {
        buf.push(
          Client.jsLinker({
            requireFn: this.requireFn,
            imports: plugin.usedModules.length
          }));
      }

      return this.asString(buf);
    });

    // Wrap the init logic so we can preload any dependencies before we launch
    // our entry point.
    compilation.mainTemplate.plugin('startup', function(source, chunk, hash) {
      if (chunk.bootstrap) {
        return source;
      }

      var loadEntry = '';
      /*istanbul ignore else */
      if (chunk.modules.some(function(m) { return m.id === 0; })) {
        loadEntry = this.renderRequireFunctionForModule(hash, chunk, '0') + '(0);';
      }

      var installedChunks = {};
      chunk.ids.forEach(function(id) {
        installedChunks[id] = 0;
      });
      installedChunks = JSON.stringify(installedChunks);

      if (chunk.linkedDeps && chunk.linkedDeps.length) {
        return this.asString([
            this.requireFn + '.ec/*ensureComponent*/(' + JSON.stringify(chunk.linkedDeps) + ', function() {',
              this.indent([
                '__webpack_components__.cc(thisComponent, ' + installedChunks + ', ' + this.requireFn + ');',
              ]),
            '})']);
      } else {
        return this.asString([
          '__webpack_components__.cc(thisComponent, ' + installedChunks + ', ' + this.requireFn + ');',
        ]);
      }
    });

    // Annotates the chunks with their external dependencies. This allows us to ensure that
    // component dependencies are loaded prior to loading the chunk itself.
    compilation.plugin('before-chunk-assets', function() {
      compilation.chunks.forEach(function(chunk) {
        var chunkDeps = [];
        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            if (dependency instanceof LinkedRequireDependency) {
              chunkDeps.push(dependency.linked);
            }
          });
          module.blocks.forEach(function(block) {
            var blockLinked = [];
            block.dependencies.forEach(function(dependency) {
              if (dependency instanceof LinkedRequireDependency) {
                blockLinked.push(dependency.linked);
              }
            });

            if (blockLinked.length) {
              // Wrap this block in a ensure component call
              module.addDependency(new LinkedBlockDependency(blockLinked, block.outerRange));
            }
          });
        });
        chunk.linkedDeps = _.uniq(chunkDeps);
      });
    });

    // Copy modules that we are linking to into the build directory, regardless of if the
    // eventual use will be from the CDN or not.
    compilation.plugin('additional-assets', function(callback) {
      var components = _.values(compilation.options.components);
      Async.forEach(components, function(component, callback) {
        var componentFiles = _.filter(component.files || [], function(file) {
          file = (!compiler.options.linker.local && component.published[file]) || file;
          return !/(^\/)|\/\//.test(file) && !compilation.assets[file];
        });

        Async.forEach(componentFiles, function(file, callback) {
          var path = Path.join(component.root, file);

          compilation.fileDependencies.push(path);

          compiler.inputFileSystem.readFile(path, function(err, content) {
            /*istanbul ignore if */
            if (err) {
              compilation.errors.push(err);
            } else {
              compilation.assets[file] = new RawSource(content);
            }
            callback();
          });
        }, callback);
      },
      callback);
    });
  });

  // Define custom requires for known external modules
  var alias = compiler.options.resolve.alias,
      aliasPriority = _.chain(alias).keys().sort().reverse().value();
  function lookupModule(param) {
    var name = param.isString() && param.string.toLowerCase();
    if (!name) {
      // We don't currently support linking to context lookups
      return;
    }

    _.each(aliasPriority, function(src) {
      var matchValue = src.toLowerCase();
      if (matchValue.replace(/\$$/, '') === name) {
        name = alias[src];
      } else if (name.indexOf(matchValue) === 0) {
        name = alias[src] + name.substr(src.length);
      }
    });

    var linked = linkedModules[name];
    if (linked) {
      return plugin.moduleId(linked);
    }
  }
  function linkModule(loc, mappedId, range, includeRequire) {
    var dep = new LinkedRequireDependency(mappedId, range, includeRequire);
    dep.loc = loc;
    return dep;
  }
  compiler.parser.plugin(['call define:amd:item', 'call require:amd:item'], function(expr, param) {
    var mappedId = lookupModule(param);
    /*istanbuil ignore else */
    if (mappedId != null) {
      var dep = linkModule(expr.loc, mappedId, param.range, true);
      this.state.current.addDependency(dep);
      return true;
    }
  });
  compiler.parser.plugin('call require:commonjs:item', function(expr, param) {
    var mappedId = lookupModule(param);
    if (mappedId != null) {
      var dep = linkModule(expr.loc, mappedId, expr.range);
      this.state.current.addDependency(dep);
      return true;
    }
  });
};

exports.prototype.moduleId = function(linked) {
  /*jshint eqnull:true */
  var mappedId,
      componentId = -1;
  _.find(this.usedModules, function(module, index) {
    if (module.name === linked.name) {
      mappedId = index;
      return module;
    }
    if (module.componentName === linked.componentName) {
      // Track the component id, if seen, so we don't generate unnecessary component mappings
      componentId = module.componentId;
    }
  });
  if (mappedId == null) {
    mappedId = this.usedModules.length;
    linked.componentId = componentId < 0 ? this.componentIdCounter++ : componentId;
    this.usedModules.push(linked);
  }
  return mappedId;
};

function calcExports(compilation, chunk, component, components) {
  var componentPaths = {},
      moduleExports = {},
      moduleChunks = {},
      seenModules = {};

  _.each(components, function(component, componentName) {
    var exports = {},
        chunks = [];
    _.each(component.modules, function(module, id) {
      exports[module.name] = id;
      chunks[id] = module.chunk;
      seenModules[module.name] = componentName;

      // Allow for string or int
      /*jshint eqeqeq:false, -W041 */
      if (id == 0) {
        exports[componentName] = id;
      }
    });
    componentPaths[componentName] = component.entry;
    moduleExports[componentName] = exports;
    moduleChunks[componentName] = component.chunks.length > 1 ? chunks : true;
  });

  var ourModuleExports = {},
      ourModuleChunks = [];

  // If we have an inlined bootstrap, then other projects can not link to us, thus
  // there is no reason to output a modules list.
  if (!compilation.options.output.bootstrap) {
    (function addChunk(c) {
      c.chunks.forEach(addChunk);
      if (c.bootstrap) {
        return;
      }

      ourModuleExports[component] = 0;
      c.modules.forEach(function(module) {
        if (module.externalName) {
          var seen = seenModules[module.externalName];
          if (seen) {
            compilation.errors.push(new Error('Unable to overwrite exported module "' + module.externalName + '" in component "' + seen + '"'));
            return;
          } else {
            ourModuleExports[module.externalName] = module.id;
            ourModuleChunks[module.id] = c.id;
            seenModules[module.externalName] = component;
          }
        }
      });
    }(chunk));
  }

  var entry = compilation.chunks.filter(function(chunk) { return chunk.entry; })[0];
  componentPaths[component] = entry.files[0];
  moduleExports[component] = ourModuleExports;
  // If we have 2 chunks, the entry and bootstrap, then we can simplify the reporting data
  moduleChunks[component] = compilation.chunks.length > 2 ? ourModuleChunks : true;

  return {
    componentPaths: componentPaths,
    moduleExports: moduleExports,
    moduleChunks: moduleChunks
  };
}


function LinkedRequireDependency(linked, range, includeRequire) {
  ModuleDependency.call(this);
  this.Class = LinkedRequireDependency;
  this.linked = linked;
  this.range = range;
  this.includeRequire = includeRequire;
}
LinkedRequireDependency.prototype = Object.create(ModuleDependency.prototype);
LinkedRequireDependency.prototype.type = 'linked require';



function LinkedRequireDependencyTemplate() {}
LinkedRequireDependencyTemplate.prototype.apply = function(dep, source) {
  var content = '.l/*ink*/(' + JSON.stringify(dep.linked) + ')';
  if (dep.includeRequire) {
    content = '__webpack_require__' + content;
  }
  source.replace(dep.range[0], dep.range[1] - 1, content);
};


function LinkedBlockDependency(linkedDeps, range) {
  ModuleDependency.call(this);
  this.Class = LinkedBlockDependency;
  this.linkedDeps = linkedDeps;
  this.range = range;
}
LinkedBlockDependency.prototype = Object.create(ModuleDependency.prototype);
LinkedBlockDependency.prototype.type = 'linked require block';


function LinkedBlockDependencyTemplate() {}
LinkedBlockDependencyTemplate.prototype.apply = function(dep, source) {
  source.replace(dep.range[0], dep.range[0] - 1,
        '__webpack_require__.ec/*ensureComponent*/(' + JSON.stringify(dep.linkedDeps) + ', function() {');
  source.replace(dep.range[1] + 1, dep.range[1],
        '});');
};
