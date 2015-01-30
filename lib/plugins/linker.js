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

    compilation.mainTemplate.plugin('bootstrap', function(extensions, chunk, hash) {
      var buf = [extensions],
          self = this;

      var linkedModules = [],
          componentNames = [],
          componentPaths = {};
      plugin.usedModules.forEach(function(used, index) {
        /* jscs:disable */
        linkedModules[index] = {c/*omponent*/: used.componentId, n/*ame*/: used.name};
        componentPaths[used.componentName] = used.entry;
        componentNames[used.componentId] = used.componentName;

        // Provide a heads up that things are going to fail
        if (!used.entry) {
          compilation.errors.push(new Error('Component "' + used.componentName + '" referenced and missing entry chunk path'));
        }
      });

      var exports = calcExports(chunk, self.outputOptions.component, compiler.options.components);

      if (chunk.bootstrap || this.outputOptions.bootstrap) {
        var entry = compilation.chunks.filter(function(chunk) { return chunk.entry; })[0];
        componentPaths[this.outputOptions.component] = entry.files[0];
        buf.push(
          '// Maps friendly module names to internal names for exports\n',
          '// This must be defined in the bootstrap to properly support AMD loading.\n',
          'var componentPaths = ' + JSON.stringify(componentPaths) + ',',
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
            exportAMD: this.outputOptions.exportAMD,
            exports: this.outputOptions.component && JSON.stringify(this.outputOptions.component),
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
        });
        chunk.linkedDeps = _.uniq(chunkDeps);
      });
    });

    // Copy modules that we are linking to into the build directory, regardless of if the
    // eventual use will be from the CDN or not.
    compilation.plugin('additional-assets', function(callback) {
      var components = _.map(plugin.usedModules, function(module) {
        return compilation.options.components[module.componentName];
      });
      components = _.uniq(components);

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

  compiler.parser.plugin('call require:commonjs:item', function(expr, param) {
    // Define custom requires for known external modules
    var linked = param.isString() && linkedModules[param.string.toLowerCase()];
    if (linked) {
      var mappedId = plugin.moduleId(linked);

      var dep = new LinkedRequireDependency(mappedId, expr.range);
      dep.loc = expr.loc;
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

function calcExports(chunk, component, components) {
  var ourModuleExports = {},
      ourModuleChunks = [];
  (function addChunk(c) {
    ourModuleExports[component] = 0;
    c.modules.forEach(function(module) {
      if (module.externalName) {
        ourModuleExports[module.externalName] = module.id;
        ourModuleChunks[module.id] = c.id;
      }
    });
    c.chunks.forEach(addChunk);
  }(chunk.bootstrap || chunk));

  var moduleExports = {},
      moduleChunks = {};
  moduleExports[component] = ourModuleExports;
  moduleChunks[component] = ourModuleChunks;

  _.each(components, function(component, componentName) {
    var exports = {},
        chunks = [];
    _.each(component.modules, function(module, id) {
      exports[module.name] = id;
      chunks[id] = module.chunk;
    });
    moduleExports[componentName] = exports;
    moduleChunks[componentName] = chunks;
  });

  return {
    moduleExports: moduleExports,
    moduleChunks: moduleChunks
  };
}


function LinkedRequireDependency(linked, range) {
  ModuleDependency.call(this);
  this.Class = LinkedRequireDependency;
  this.linked = linked;
  this.range = range;
}
LinkedRequireDependency.prototype = Object.create(ModuleDependency.prototype);
LinkedRequireDependency.prototype.type = 'linked require';



function LinkedRequireDependencyTemplate() {}
LinkedRequireDependencyTemplate.prototype.apply = function(dep, source) {
  var content = '.l/*ink*/(' + JSON.stringify(dep.linked) + ')';
  source.replace(dep.range[0], dep.range[1] - 1, content);
};
