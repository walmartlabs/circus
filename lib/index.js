var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    TemplatePlugin = require('./templates'),
    Resolver = require('./resolver'),
    fs = require('fs'),
    Path = require('path'),
    webpack = require('webpack'),

    LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin'),
    FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');

module.exports.config = function(additions) {
  var package = {};
  if (!additions || !additions.output || !additions.output.component) {
    package = JSON.parse(fs.readFileSync('package.json').toString());
  }

  var options = _.defaults({
    target: function(compiler) {
      compiler.apply(
        new TemplatePlugin(),
        new FunctionModulePlugin(options.output),
        new LoaderTargetPlugin('web'));
    },
    circusNamespace: 'Circus',

    devtool: 'source-map',
    output: _.defaults({
      component: package.name,

      sourceMapFilename: '[file].map'
    }, additions.output),

    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);

  options.components = options.components || Resolver.findComponents(options.resolve.modulesDirectories);

  return options;
};

function resolve(additions) {
  return _.extend({
    modulesDirectories: ['web_modules', 'node_modules', 'bower_components']
  }, additions);
}

function plugins(additions) {
  var base = [
    new PackPlugin(),
    new webpack.ResolverPlugin(
      new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('bower.json', ['main'])
    )
  ];

  return additions ? base.concat(additions) : base;
}

