var Async = require('async'),
    CircusJsonSource = require('../circus-json-source'),
    Path = require('path');

module.exports = exports = function ModuleExportPlugin() {
};

exports.prototype.apply = function(compiler) {
  var contextPaths = [{path: compiler.context, name: compiler.options.output.component}],
      packagePaths = {};
  packagePaths[compiler.context] = contextPaths[0];

  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('optimize-tree', function(chunks, modules, callback) {
      Async.each(modules, function(module, callback) {
          resolvePackage(compiler, packagePaths, contextPaths, module, callback);
        },
        function(err) {
          // Sort so that the name lookup logic looks depth first
          contextPaths = contextPaths.sort(function(a, b) {
            return a.path.length - b.path.length;
          });

          callback(err);
        });
    });

    compilation.plugin('before-chunk-assets', function() {
      var outputOptions = compiler.options.output,
          hideInternals = outputOptions.hideInternals;
      if (hideInternals === true) {
        return;
      }

      if (outputOptions.externals && outputOptions.externals[outputOptions.component]) {
        compilation.errors.push(new Error('Unable to remap the component name alias'));
        return;
      }

      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          module.externalName = module.externalName || moduleName(module, contextPaths);

          if (outputOptions.externals) {
            var candidate = module.externalName;
            module.externalName = outputOptions.externals[candidate] || candidate;

            if (module.externalName !== candidate) {
              module.originalExternal = candidate;
            }
          }

          if (hideInternals && hideInternals.test(module.externalName)) {
            module.externalName = undefined;
          }
        });
      });
    });

    compilation.plugin('additional-assets', function(callback) {
      compilation.assets['circus.json'] = new CircusJsonSource(compilation);

      setImmediate(callback);
    });

    compilation.plugin('circus-json', function(json) {
      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          var name = module.externalName;
          if (name) {
            json.modules[module.id] = {
              chunk: chunk.id,
              name: name
            };
          }
        });
      });
    });
  });
};

function resolvePackage(compiler, packagePaths, componentPaths, module, callback) {
  if (!module.resource) {
    // This is a context dependency. We won't export this directly, but potentially the children.
    return callback();
  }

  var inputFileSystem = compiler.inputFileSystem,
      components = module.resource.split(/\//g),
      i = components.length,
      packagePath;
  Async.whilst(
      function() { return !packagePath && i--; },
      function(next) {
        var candidatePath = components.slice(0, i).join('/'),
            name = components[i-1];
        if (packagePaths[candidatePath]) {
          packagePath = packagePaths[candidatePath];
          return next();
        }

        inputFileSystem.readFile(candidatePath + '/package.json', function(err, data) {
          if (data) {
            data = JSON.parse(data+'');
            packagePath = packagePaths[candidatePath] = {
              path: candidatePath,
              name: name,
              main: (data.main || '').replace(/\.js$/, '')
            };
            componentPaths.push(packagePath);
            return next();
          }

          inputFileSystem.readFile(candidatePath + '/bower.json', function(err, data) {
            if (data) {
              data = JSON.parse(data+'');
              packagePath = packagePaths[candidatePath] = {
                path: candidatePath,
                name: name,
                main: (data.main || '').replace(/\.js$/, '')
              };
              componentPaths.push(packagePath);
            }
            next();
          });
        });
      },
      callback);
}

// Attempt to generate the friendliest name for a given module based on how it
// was requested and it's path.
function moduleName(module, contextPaths) {
  if (!module.resource) {
    // This is a context dependency. We won't export this directly, but potentially the children.
    return;
  }

  var rawResource = _.last(module.rawRequest.split(/!/g));
  if (!/^[.\/]/.test(rawResource)) {
    return module.rawRequest;
  }

  // Check if there are any matching modules that might contain this file   
  var len = contextPaths.length;
  while (len--) {
    var context = contextPaths[len];
    if (module.resource.indexOf(context.path) === 0) {
      var moduleName = Path.relative(context.path, module.resource).replace(/\.js$/, '');
      if (moduleName === context.main) {
        // If this is the entry point for the module then we export it using the simplified
        // module name vs. whatever path might exist.
        return context.name;
      } else {
        return context.name + '/' + moduleName;
      }
    }
  }
}
