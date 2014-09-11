var WebPack = require('webpack'),
    BasicEvaluatedExpression = require('webpack/lib/BasicEvaluatedExpression'),
    ConstDependency = require('webpack/lib/dependencies/ConstDependency');

module.exports = exports = function RouterPlugin() {
  this.routeMap = {};
};

exports.prototype.apply = function(compiler) {
  var plugin = this;

  // Mark this as primitive expression that can be evaluated below. This is not done
  // automatically because Zeus is generally a defined external.
  compiler.parser.plugin('evaluate defined Identifier Zeus.router', function(expression) {
    return new BasicEvaluatedExpression().setIdentifier('Zeus.router').setRange(expression.range);
  });

  compiler.parser.plugin('call Zeus.router', function(expr) {
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
      // console.log(this.state);
      this.state.compilation.warnings.push(new Error(this.state.current.resource + ':' + expr.loc.start.line + ' - No routes found for Zeus.router'));
    }
  });
  compiler.parser.plugin('evaluate typeof Zeus.router', function(expr) {
    return new BasicEvaluatedExpression().setString('function').setRange(expr.range);
  });
  compiler.parser.plugin('typeof Zeus.router', function(expr) {
    var dep = new ConstDependency('"function"', expr.range);
    dep.loc = expr.loc;
    this.state.current.addDependency(dep);
    return true;
  });
};
