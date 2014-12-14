var BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency'),
    NullFactory = require('webpack/lib/NullFactory'),
    RequireRouterListing = require('../dependencies/require-router-listing'),
    RequireRouterDependenciesBlock = require('../dependencies/require-router-dependencies-block'),
    RequireRouterItemDependency = require('../dependencies/require-router-item'),

    Router = require('./router');


module.exports = exports = function LoaderPlugin() {
  this.router = new Router();
};

exports.prototype.apply = function(compiler) {
  var plugin = this,
      namespace = compiler.options.circusNamespace || 'Circus',
      router = this.router;

  // Delegate to the router plugin for parsing the routes from the imports
  router.apply(compiler);

  compiler.plugin('compilation', function(compilation, params) {
    compilation.dependencyFactories.set(RequireRouterItemDependency, params.normalModuleFactory);
    compilation.dependencyTemplates.set(RequireRouterItemDependency, new RequireRouterItemDependency.Template());

    compilation.dependencyFactories.set(RequireRouterListing, new NullFactory());
    compilation.dependencyTemplates.set(RequireRouterListing, new RequireRouterListing.Template(plugin.router.routeMap, compilation));

    compilation.plugin('before-chunk-assets', function() {
      compilation.chunks.forEach(function(chunk) {
        var chunkHasLoader;

        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
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
            }
          });
        });
      });
    });

    compilation.plugin('circus-json', function(json) {
      compilation.chunks.forEach(function(chunk) {
        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            // Only collect routes for modules explicitly loaded via a loader call
            if (dependency instanceof RequireRouterListing) {
              // Iterate over everything that is bundled and output it to our map structure
              dependency.blocks.forEach(function(block) {
                var module = block.dependencies[0].module || {},
                    routeMap = router.routeMap[module.resource];
                if (!routeMap) {
                  return;
                }

                RequireRouterListing.extractMap(module, block, routeMap, json);
              });
            }
          });
        });
      });
    });
  });

  // If the library namespace is explicitly imported then it will be filtered via the defined
  // list and webpack won't evaluate the object calls made on it.
  compiler.parser.plugin('evaluate MemberExpression', function(expression) {
    if (expression.object.name === namespace && expression.property.name === 'loader') {
      return new BasicEvaluatedExpression().setIdentifier(namespace + '.loader').setRange(expression.range);
    }
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
