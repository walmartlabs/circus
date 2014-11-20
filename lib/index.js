var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    ZeusTemplatePlugin = require('./templates/zeus-template'),
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
        new ZeusTemplatePlugin(),
        new FunctionModulePlugin(options.output),
        new LoaderTargetPlugin('web'));
    },

    devtool: 'source-map',
    output: _.defaults({
      component: package.name,

      sourceMapFilename: '[file].map'
    }, additions.output),

    module: _.defaults({
      loaders: loaders(additions.module && additions.module.loaders)
    }, additions.module),

    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);

  options.components = options.components || resolveComponents(options.resolve.modulesDirectories);

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

// Examines all of the given directories for potential component packages.
// The basic criteria for a component package is to have the file pack.json in it's
// root. For each of modulesDirectories, all children will be examined for this
// particular file.
function resolveComponents(modulesDirectories) {
  var ret = {};
  modulesDirectories.forEach(function(directory) {
    var children = [];
    try {
      children = fs.readdirSync(directory);
    } catch (err) {
      /* istanbul ignore if */
      if (err.code !== 'ENOENT') {
        throw new Error('Failed to enumerate modules in "' + directory + '"\n' + err.stack);
      }
    }

    children.forEach(function(child) {
      var packPath = Path.join(directory, child, 'pack.json');
      try {
        var componentDefinition = JSON.parse(fs.readFileSync(packPath).toString());
        ret[child] = _.defaults({
          root: Path.dirname(packPath),
        }, componentDefinition);
      } catch (err) {
        /* istanbul ignore if */
        if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
          throw new Error('Failed to load component info in "' + packPath + '"\n' + err.stack);
        }
      }
    });
  });
  return ret;
}
