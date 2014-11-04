var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    webpack = require('webpack');

module.exports.config = function(additions) {
  return _.defaults({
    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);
};

function resolve(additions) {
  return _.defaults({
    modulesDirectories: ['web_modules', 'node_modules', 'bower_components']
  }, additions);
};

function plugins(additions) {
  var base = [
    new PackPlugin(),
    new webpack.ResolverPlugin(
      new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('bower.json', ['main'])
    )
  ];

  return additions ? base.concat(additions) : base;
};
