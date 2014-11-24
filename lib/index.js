var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    TemplatePlugin = require('./templates'),
    Resolver = require('./resolver'),
    fs = require('fs'),
    Path = require('path'),
    webpack = require('webpack'),

    LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin'),
    FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin'),
    RawSource = require('webpack-core/lib/RawSource');


module.exports.config = function(additions) {
  if (Array.isArray(additions)) {
    var config = additions.map(module.exports.config);
    if (config.length > 1) {
      config.unshift(metaConfig(additions));
    }

    return config;
  }

  var package = {},
      output = additions.output || {};
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

      path: Path.join(output.path || '', output.pathPrefix || ''),
      sourceMapFilename: '[file].map'
    }, additions.output),

    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);

  options.components = options.components
      || Resolver.findComponents(options.configId, options.resolve.modulesDirectories);

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

/**
 * Generates a simple build configuration that only outputs the meta circus file.
 *
 * This allows us to generate this file, while continuing to be configuration driven
 * and not requiring external consumers to be aware of the need to generate this file.
 */
function metaConfig(configs) {
  return {
    target: function(compiler) {
      compiler.plugin('compilation', function(compilation) {
        compilation.plugin('additional-assets', function(callback) {
          try {
            var config = JSON.stringify(Resolver.metaConfig(configs));
            compilation.assets['circus.json'] = new RawSource(config);
          } catch (err) {
            compilation.errors.push(err);
          }

          setImmediate(callback);
        });
      });
    },
    output: {
      path: (configs[0].output || {}).path
    }
  };
}
