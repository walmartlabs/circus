var NullDependency = require('webpack/lib/dependencies/NullDependency');

function RequireRouterListing(blocks, expr, resource) {
  NullDependency.call(this);
  this.Class = RequireRouterListing;
  this.blocks = blocks;
  this.expr = expr;
  this.range = expr.range;
  this.resource = resource;
}
module.exports = RequireRouterListing;

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

    RequireRouterListing.extractMap(module, block, routeMap, content);
  }, this);

  source.replace(dep.range[0], dep.range[1] - 1, '' + namespace + '.loader(__webpack_require__, ' + JSON.stringify(content) + ')');
};


RequireRouterListing.extractMap = function(module, block, routeMap, content) {
  routeMap.forEach(function(route) {
    content.modules[module.id] = {chunk: block.chunk.id};
    content.routes[route] = module.id;
  });
};
