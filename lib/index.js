var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    TemplatePlugin = require('./templates'),
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

// Examines all of the given directories for potential component packages.
// The basic criteria for a component package is to have the file circus.json in it's
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
      var circusPath = Path.join(directory, child, 'circus.json');
      try {
        var componentDefinition = JSON.parse(fs.readFileSync(circusPath).toString());
        ret[child] = _.defaults({
          root: Path.dirname(circusPath),
        }, componentDefinition);
      } catch (err) {
        /* istanbul ignore if */
        if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
          throw new Error('Failed to load component info in "' + circusPath + '"\n' + err.stack);
        }
      }
    });
  });
  return ret;
}
