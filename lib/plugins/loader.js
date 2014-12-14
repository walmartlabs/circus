var BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency'),
    NullFactory = require('webpack/lib/NullFactory'),
    CircusJsonSource = require('../circus-json-source'),
    RequireRouterListing = require('../dependencies/require-router-listing'),
    RequireRouterDependenciesBlock = require('../dependencies/require-router-dependencies-block'),
    RequireRouterItemDependency = require('../dependencies/require-router-item'),

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
      compilation.assets['circus.json'] = new CircusJsonSource(compilation, plugin.router);

      setImmediate(callback);
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


// Attempt to generate the friendliest name for a given module based on how it
// was requested and it's path.
function moduleName(module, contextPaths) {
  // We only care about files that are explicitly requested (vs. implicit depenencies)
  if (module.rawRequest) {
    // This is a request for something loaded through a module system (i.e.
    // require('handlebars') vs. require('./handlebars') or require('../handlebars')
    if (!/^\.{0,2}\//.test(module.rawRequest)) {
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
