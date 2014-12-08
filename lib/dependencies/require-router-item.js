var ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

function RequireRouterItemDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = RequireRouterItemDependency;
}
module.exports = RequireRouterItemDependency;
RequireRouterItemDependency.prototype = Object.create(ModuleDependency.prototype);
RequireRouterItemDependency.prototype.type = 'require.router item';

RequireRouterItemDependency.Template = require('webpack/lib/dependencies/NullDependencyTemplate');
