var AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock'),
    BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency'),
    ModuleDependency = require('webpack/lib/dependencies/ModuleDependency'),
    NullDependency = require('webpack/lib/dependencies/NullDependency'),
    NullFactory = require('webpack/lib/NullFactory'),
    RawSource = require('webpack-core/lib/RawSource'),

    Router = require('./router');


// Parses Zeus.loader
module.exports = exports = function LoaderPlugin() {
  this.router = new Router();
};

exports.prototype.apply = function(compiler) {
  var plugin = this;

  // Delegate to the router plugin for parsing the routes from the imports
  this.router.apply(compiler);

  compiler.plugin('compilation', function(compilation, params) {
    compilation.dependencyFactories.set(RequireRouterItemDependency, params.normalModuleFactory);
    compilation.dependencyTemplates.set(RequireRouterItemDependency, new RequireRouterItemDependency.Template());

    compilation.dependencyFactories.set(RequireRouterListing, new NullFactory());
    compilation.dependencyTemplates.set(RequireRouterListing, new RequireRouterListing.Template(plugin.router.routeMap, compilation));

    compilation.plugin('additional-assets', function(callback) {
      // Extract all declared routes
      var json = {modules: {}, routes: {}},
          foundRoutes;
      compilation.chunks.forEach(function(chunk) {
        var chunkHasLoader;

        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            // Only collect routes for modules explicitly loaded via a loader call
            if (dependency instanceof RequireRouterListing) {
              // Warn if multiple instances of a loader occur in a given module. This can
              // lead to some interesting behaviors with conflicting urls that we want to
              // avoid.
              if (chunkHasLoader) {
                compilation.warnings.push(new Error(
                    dependency.resource + ':' + dependency.expr.loc.start.line
                    + ' - Zeus.loader used multiple times in one chunk.'));
              }
              chunkHasLoader = true;

              // Iterate over everything that is bundled and output it to our map structure
              dependency.blocks.forEach(function(block) {
                var module = block.dependencies[0].module || {},
                    routeMap = plugin.router.routeMap[module.resource];
                if (!routeMap) {
                  return;
                }

                extractMap(module, block, routeMap, json);

                foundRoutes = true;
              });
            }
          });
        });
      });

      if (foundRoutes) {
        compilation.assets['pack.json'] = new RawSource(JSON.stringify(json));
      }

      setImmediate(callback);
    });
  });

  compiler.parser.plugin('call Zeus.loader', function(expr) {
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
  compiler.parser.plugin('evaluate typeof Zeus.loader', function(expr) {
    return new BasicEvaluatedExpression().setString('function').setRange(expr.range);
  });
  compiler.parser.plugin('typeof Zeus.loader', function(expr) {
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
      compilation.warnings.push(new Error(resource + ':' + expr.loc.start.line + ' - Zeus.loader used to load module "`' + block.depName + '" declaring no routes'));
      return;
    }

    extractMap(module, block, routeMap, content);
  }, this);

  source.replace(dep.range[0], dep.range[1] - 1, 'Zeus.loader(__webpack_require__, ' + JSON.stringify(content) + ')');
};

function extractMap(module, block, routeMap, content) {
  routeMap.forEach(function(route) {
    content.modules[module.id] = {chunk: block.chunk.id};
    content.routes[route] = module.id;
  });
}
