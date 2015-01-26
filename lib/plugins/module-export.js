var CircusJsonSource = require('../circus-json-source'),
    Path = require('path');

module.exports = exports = function ModuleExportPlugin() {
};

exports.prototype.apply = function(compiler) {
  var contextPaths = [{path: compiler.context, name: compiler.options.output.component}];

  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('before-chunk-assets', function() {
      var hideInternals = compiler.options.output.hideInternals;
      if (hideInternals === true) {
        return;
      }

      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          module.externalName = module.externalName || moduleName(module, contextPaths);

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

// Attempt to generate the friendliest name for a given module based on how it
// was requested and it's path.
function moduleName(module, contextPaths) {
  // We only care about files that are explicitly requested (vs. implicit depenencies)
  if (module.rawRequest) {
    // This is a request for something loaded through a module system (i.e.
    // require('handlebars') vs. require('./handlebars') or require('../handlebars')
    if (!/^\!?\.{0,2}\//.test(module.rawRequest)) {
      contextPaths.push({
        path: module.context,
        name: module.rawRequest
      });

      return module.rawRequest;
    } else {
      // We have a direct path request
      var len = contextPaths.length;
      while (len--) {
        var context = contextPaths[len];
        /*istanbul ignore else: Proactive sanity code */
        if (module.resource.indexOf(context.path) === 0) {
          var moduleName = Path.relative(context.path, module.resource).replace(/\.js$/, '');
          return context.name + '/' + moduleName;
        }
      }

      // There are fall through cases here, primarily tieing to the internals of webpack. 
      // We can safely ignore these as they should not be exported anyway.
    }
  }
}
