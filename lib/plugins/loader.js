var AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock'),
    BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency'),
    ModuleDependency = require('webpack/lib/dependencies/ModuleDependency'),
    NullDependency = require('webpack/lib/dependencies/NullDependency'),
    NullFactory = require('webpack/lib/NullFactory'),
    Source = require('webpack-core/lib/Source'),

    Router = require('./router'),

    Path = require('path');


module.exports = exports = function LoaderPlugin() {
  this.router = new Router();
};

exports.prototype.apply = function(compiler) {
  var plugin = this,
      namespace = compiler.options.circusNamespace || 'Circus',
      contextPaths = [{path: compiler.context, name: compiler.options.output.component}];

  // Delegate to the router plugin for parsing the routes from the imports
  this.router.apply(compiler);

  compiler.plugin('compilation', function(compilation, params) {
    compilation.dependencyFactories.set(RequireRouterItemDependency, params.normalModuleFactory);
    compilation.dependencyTemplates.set(RequireRouterItemDependency, new RequireRouterItemDependency.Template());

    compilation.dependencyFactories.set(RequireRouterListing, new NullFactory());
    compilation.dependencyTemplates.set(RequireRouterListing, new RequireRouterListing.Template(plugin.router.routeMap, compilation));

    compilation.plugin('before-chunk-assets', function() {
      var hideInternals = compiler.options.output.hideInternals;
      if (hideInternals === true) {
        return;
      }

      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          module.externalName = moduleName(module, contextPaths);

          if (hideInternals && hideInternals.test(module.externalName)) {
            module.externalName = undefined;
          }
        });
      });
    });
    compilation.plugin('additional-assets', function(callback) {
      compilation.assets['circus.json'] = new PackJsonSource(compilation, plugin.router);

      setImmediate(callback);
    });
  });

  compiler.parser.plugin('call ' + namespace + '.loader', function(expr) {
    // Do not parse if no args or an empty array is passed.
    if (!expr.arguments[0] || !expr.arguments[0].elements || !expr.arguments[0].elements.length) {
      this.state.compilation.warnings.push(new Error(this.state.current.resource + ':' + expr.loc.start.line + ' - No imports'));
      return;
    }

    var dependenciesExpr = this.evaluateExpression(expr.arguments[0]),
        old = this.state.current;

    var blocks = dependenciesExpr.items.map(function(depName) {
      try {
        // Create a new chunk context that the router will be loaded into
        var dep = new RequireRouterDependenciesBlock(depName.string);
        this.state.current = dep;
        dep.addDependency(new RequireRouterItemDependency(depName.string, dep));
        old.addBlock(dep);

        return dep;
      } finally {
        this.state.current = old;
      }
    }, this);

    this.state.current.addDependency(new RequireRouterListing(blocks, expr, this.state.current.resource));
    return true;
  });
  compiler.parser.plugin('evaluate typeof ' + namespace + '.loader', function(expr) {
    return new BasicEvaluatedExpression().setString('function').setRange(expr.range);
  });
  compiler.parser.plugin('typeof ' + namespace + '.loader', function(expr) {
    var dep = new ConstDependency('"function"', expr.range);
    dep.loc = expr.loc;
    this.state.current.addDependency(dep);
    return true;
  });
};



function RequireRouterDependenciesBlock(depName, chunkName, module, loc) {
  AsyncDependenciesBlock.call(this, chunkName, module, loc);
  this.depName = depName;
}
RequireRouterDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);

function RequireRouterItemDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = RequireRouterItemDependency;
}
RequireRouterItemDependency.prototype = Object.create(ModuleDependency.prototype);
RequireRouterItemDependency.prototype.type = 'require.router item';

RequireRouterItemDependency.Template = require('webpack/lib/dependencies/NullDependencyTemplate');



function RequireRouterListing(blocks, expr, resource) {
  NullDependency.call(this);
  this.Class = RequireRouterListing;
  this.blocks = blocks;
  this.expr = expr;
  this.range = expr.range;
  this.resource = resource;
}
RequireRouterListing.prototype = Object.create(NullDependency.prototype);
RequireRouterListing.prototype.type = 'require.router';

RequireRouterListing.prototype.updateHash = function(hash) {
  // We need to invalidate our content when the upstream file changes. Since we don't know if
  // the particular change impacted the routing table as well.
  this.blocks.forEach(function(block) {
    block.dependencies.forEach(function(dependency) {
      if (dependency.module) {
        hash.update(dependency.module.buildTimestamp + '');
      }
    });
  });
};


RequireRouterListing.Template = function RequireRouterListingTemplate(routeMap, compilation) {
  this.routeMap = routeMap;
  this.compilation = compilation;
};

RequireRouterListing.Template.prototype.apply = function(dep, source) {
  var content = {modules: {}, routes: {}},
      compilation = this.compilation,
      namespace = compilation.options.circusNamespace,
      resource = dep.resource,
      expr = dep.expr;

  dep.blocks.forEach(function(block) {
    var module = block.dependencies[0].module;
    if (!module) {
      return;
    }

    block.parent.fileDependencies.push(module.resource);

    var routeMap = this.routeMap[module.resource];
    if (!routeMap) {
      compilation.warnings.push(new Error(resource + ':' + expr.loc.start.line + ' - ' + namespace + '.loader used to load module "`' + block.depName + '" declaring no routes'));
      return;
    }

    extractMap(module, block, routeMap, content);
  }, this);

  source.replace(dep.range[0], dep.range[1] - 1, '' + namespace + '.loader(__webpack_require__, ' + JSON.stringify(content) + ')');
};

function PackJsonSource(compilation, router) {
  this.compilation = compilation;
  this.router = router;
}
PackJsonSource.prototype = Object.create(Source.prototype);

PackJsonSource.prototype._bake = function() {
  // Extract all declared routes
  var json = {modules: {}, routes: {}, files: []},
      compilation = this.compilation,
      router = this.router;

  compilation.chunks.forEach(function(chunk) {
    var chunkHasLoader;

    if (chunk.entry) {
      json.entry = chunk.files[0];
    }
    json.files.push.apply(json.files, chunk.files);

    if (chunk.cssChunk) {
      json.files.push(chunk.cssChunk.filename);
    }

    chunk.modules.forEach(function(module) {
      var name = module.externalName;
      if (name) {
        json.modules[module.id] = {
          chunk: chunk.id,
          name: name
        };
      }

      module.dependencies.forEach(function(dependency) {
        // Only collect routes for modules explicitly loaded via a loader call
        if (dependency instanceof RequireRouterListing) {
          // Warn if multiple instances of a loader occur in a given module. This can
          // lead to some interesting behaviors with conflicting urls that we want to
          // avoid.
          if (chunkHasLoader) {
            compilation.warnings.push(new Error(
                dependency.resource + ':' + dependency.expr.loc.start.line
                + ' - ' + compilation.options.circusNamespace + '.loader used multiple times in one chunk.'));
          }
          chunkHasLoader = true;

          // Iterate over everything that is bundled and output it to our map structure
          dependency.blocks.forEach(function(block) {
            var module = block.dependencies[0].module || {},
                routeMap = router.routeMap[module.resource];
            if (!routeMap) {
              return;
            }

            extractMap(module, block, routeMap, json);
          });
        }
      });
    });
  });

  return {
    source: JSON.stringify(json, undefined, 2)
  };
};

// Attempt to generate the friendliest name for a given module based on how it
// was requested and it's path.
function moduleName(module, contextPaths) {
  // We only care about files that are explicitly requested (vs. implicit depenencies)
  if (module.rawRequest) {
    // This is a request for something loaded through a module system (i.e.
    // require('handlebars') vs. require('./handlebars')
    if (!/^\.?\//.test(module.rawRequest)) {
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

      /*istanbul ignore next: Proactive sanity code */
      throw new Error('Module name "' + module.rawRequest + '" at "' + module.resource + '" could not be mapped to a context');
    }
  }
}

function extractMap(module, block, routeMap, content) {
  routeMap.forEach(function(route) {
    content.modules[module.id] = {chunk: block.chunk.id};
    content.routes[route] = module.id;
  });
}
