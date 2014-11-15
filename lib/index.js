var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    ZeusTemplatePlugin = require('./templates/zeus-template'),
    fs = require('fs'),
    webpack = require('webpack'),

    LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin'),
    FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin');

module.exports.config = function(additions) {
  var package = {};
  if (!additions || !additions.output || !additions.output.package) {
    package = JSON.parse(fs.readFileSync('package.json').toString());
  }

  var options = _.defaults({
    target: function(compiler) {
      compiler.apply(
        new ZeusTemplatePlugin(),
        new FunctionModulePlugin(options.output),
        new LoaderTargetPlugin('web'));
    },

    output: _.defaults({
      package: package.name,

      sourceMapFilename: '[file].map'
    }, additions.output),

    module: _.defaults({
      loaders: loaders(additions.module && additions.module.loaders)
    }, additions.module),

    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);
  return options;
};

function resolve(additions) {
  return _.defaults({
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

function loaders(additions) {
  var base = [
    {
      test: /\.(handlebars|hbs)$/,
      loader: require.resolve('./loaders/handlebars')
          + '?knownHelpers=template,super,view,element,button,url,link,collection,empty,collection-element,layout-element,loading'
    },

    { test: /\.styl$/, loader: require.resolve('stylus-loader') }
  ];

  return additions ? base.concat(additions) : base;
}
