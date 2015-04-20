var _ = require('lodash'),
    Async = require('async'),
    CircusJsonSource = require('../circus-json-source'),
    Path = require('path'),
    Utils = require('../utils');

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

      var seen = {};

      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          var type = 'assigned';

          if (!module.externalName) {
            var name = moduleName(module, contextPaths);
            if (!name) {
              return;
            }

            module.externalName = name.name;
            type = name.type;
          }

          if (outputOptions.externals) {
            var candidate = module.externalName;
            module.externalName = outputOptions.externals[candidate] || candidate;

            if (module.externalName !== candidate) {
              type = 'externals';
            }
          }

          // Filter out the export if not desired
          if (hideInternals && hideInternals.test(module.externalName)) {
            module.externalName = undefined;
            return;
          }

          // Check to see if one of the alias mechanisms created duplicates.
          // If so then we want to select aliases/externals vs. inferred names.
          var seenModule = seen[module.externalName];
          if (seenModule && compareType(seenModule.type, type) > 0) {
            // Not exporting this module
            module.externalName = undefined;
          } else {
            // Exporting this module
            if (seenModule) {
              seenModule.module.externalName = undefined;
            }
            seen[module.externalName] = {
              type: type,
              module: module
            };
          }
        });
      });
    });

    compilation.plugin('additional-assets', function(callback) {
      compilation.assets['circus.json'] = new CircusJsonSource(compilation);
      Utils.bootstrapAsset(compilation, 'circus.json');

      setImmediate(callback);
    });

    compilation.plugin('circus-json', function(json) {
      // If we have an inlined bootstrap, then other projects can not link to us, thus
      // there is no reason to output a modules list.
      if (compiler.options.output.bootstrap) {
        return;
      }

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
            name = components[i - 1];
        if (packagePaths[candidatePath]) {
          packagePath = packagePaths[candidatePath];
          return next();
        }

        inputFileSystem.readFile(candidatePath + '/bower.json', function(err, data) {
          if (!err && data) {
            data = JSON.parse(data + '');

            var main = data.main || '';
            /*istanbul ignore if: Simple case and tests are long enough as it is. */
            if (Array.isArray(main)) {
              main = main[0];
            }

            packagePath = packagePaths[candidatePath] = {
              path: candidatePath,
              name: name,
              main: main.replace(/\.js$/, '').replace(/^\.\//, '')
            };
            componentPaths.push(packagePath);
            return next();
          }

          inputFileSystem.readFile(candidatePath + '/package.json', function(err, data) {
            if (!err && data) {
              data = JSON.parse(data + '');
              packagePath = packagePaths[candidatePath] = {
                path: candidatePath,
                name: name,
                main: (data.main || '').replace(/\.js$/, '').replace(/^\.\//, '')
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

  // Check to see if this is a direct match for any module mains
  var len = contextPaths.length,
      context;
  while (len--) {
    context = contextPaths[len];
    if (module.resource.indexOf(context.path) === 0) {
      var nameFromPath = Path.relative(context.path, module.resource).replace(/\.js$/, '');
      if (nameFromPath === context.main) {
        // If this is the entry point for the module then we export it using the simplified
        // module name vs. whatever path might exist.
        return {name: context.name, type: 'main'};
      }
    }
  }

  // Now check to see if we have an alias
  var rawResource = _.last(module.rawRequest.split(/!/g));
  if (!(/^[.\/]/).test(rawResource)) {
    return {name: module.rawRequest, type: 'alias'};
  }

  // Check if there are any matching modules that might contain this file
  len = contextPaths.length;
  while (len--) {
    context = contextPaths[len];
    if (module.resource.indexOf(context.path) === 0) {
      var childModuleName = Path.relative(context.path, module.resource).replace(/\.js$/, '');
      return {name: context.name + '/' + childModuleName, type: 'module'};
    }
  }
}

var typePriority = {
  module: 0,
  main: 1,
  alias: 2,
  externals: 3,
  assigned: 4
};

function compareType(a, b) {
  return typePriority[a] - typePriority[b];
}
