var AsyncDependenciesBlock = require('webpack/lib/AsyncDependenciesBlock');

function RequireRouterDependenciesBlock(depName, chunkName, module, loc) {
  AsyncDependenciesBlock.call(this, chunkName, module, loc);
  this.depName = depName;
}
module.exports = RequireRouterDependenciesBlock;
RequireRouterDependenciesBlock.prototype = Object.create(AsyncDependenciesBlock.prototype);
