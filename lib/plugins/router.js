var BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency');

module.exports = exports = function RouterPlugin() {
  this.routeMap = {};
};

exports.prototype.apply = function(compiler) {
  var plugin = this,
      namespace = compiler.options.circusNamespace;

  // If the library namespace is explicitly imported then it will be filtered via the defined
  // list and webpack won't evaluate the object calls made on it.
  compiler.parser.plugin('evaluate MemberExpression', function(expression) {
    if (expression.object.name === namespace && expression.property.name === 'router') {
      return new BasicEvaluatedExpression().setIdentifier(namespace + '.router').setRange(expression.range);
    }
  });

  compiler.parser.plugin('call ' + namespace + '.router', function(expr) {
    var definition = expr.arguments[0],
        resource = this.state.current.resource,
        routesFound;

    if (definition && definition.type === 'ObjectExpression') {
      definition.properties.forEach(function(property) {
        if (property.key.name === 'routes') {
          plugin.routeMap[resource] = property.value.properties.map(function(route) {
            return route.key.value;
          });
          routesFound = true;
        }
      });
    }

    if (!routesFound) {
      this.state.compilation.warnings.push(new Error(this.state.current.resource + ':' + expr.loc.start.line + ' - No routes found for ' + namespace + '.router'));
    }
  });
  compiler.parser.plugin('evaluate typeof ' + namespace + '.router', function(expr) {
    return new BasicEvaluatedExpression().setString('function').setRange(expr.range);
  });
  compiler.parser.plugin('typeof ' + namespace + '.router', function(expr) {
    var dep = new ConstDependency('"function"', expr.range);
    dep.loc = expr.loc;
    this.state.current.addDependency(dep);
    return true;
  });
};
