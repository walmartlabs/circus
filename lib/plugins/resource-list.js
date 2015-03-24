var _ = require('lodash');

module.exports = exports = function() {
};

exports.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    var resourceList = compilation.resourceList = [];

    compilation.plugin('normal-module-loader', function(loaderContext, module) {
      loaderContext.emitResource = function(url, content) {
        loaderContext.emitFile(url, content);

        module.resourceList = module.resourceList || [];
        module.resourceList.push(url);
      };
    });

    compilation.plugin('additional-chunk-assets', function() {
      _.each(compilation.modules, function(module) {
        if (module.resourceList) {
          _.each(module.chunks, function(chunk) {
            chunk.files = _.unique(chunk.files.concat(module.resourceList));
          });
        }
      });
    });
  });
};
