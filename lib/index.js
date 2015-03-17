var _ = require('lodash'),
    BowerCopyPlugin = require('./plugins/bower-copy-plugin'),
    PackPlugin = require('./plugins'),
    TemplatePlugin = require('./templates'),
    Publish = require('./publish'),
    Resolver = require('./resolver'),
    fs = require('fs'),
    Path = require('path'),
    Semver = require('semver'),
    webpack = require('webpack'),

    LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin'),
    FunctionModulePlugin = require('webpack/lib/FunctionModulePlugin'),
    RawSource = require('webpack-core/lib/RawSource'),

    package = require('../package.json');


module.exports.loadConfigs = function(moduleDir, callback) {
  return Resolver.loadConfigs(moduleDir, callback);
};

module.exports.publish = function(buildDir, options) {
  return Publish.publish(buildDir, options);
};

module.exports.config = function(additions) {
  if (Array.isArray(additions)) {
    var config = additions.map(applyConfig);
    if (config.length > 1) {
      config.unshift(metaConfig(additions));
    } else {
      config[0].plugins.push(new BowerCopyPlugin());
    }

    return config;
  } else {
    var config = applyConfig(additions);
    config.plugins.push(new BowerCopyPlugin());
    return config;
  }
};

function applyConfig(additions) {
  var package = {},
      output = additions.output || {};
  if (!additions || !additions.output || !additions.output.component) {
    package = JSON.parse(fs.readFileSync('package.json').toString());
  }

  var options = _.extend({
    target: function(compiler) {
      compiler.apply(
        new TemplatePlugin(),
        new FunctionModulePlugin(options.output),
        new LoaderTargetPlugin('web'));
    },

    devtool: 'source-map',

    sourcePrefix: '  ',

    // We need to impose a wait delay here to avoid issues due to early builds.
    // This can manifest itself via unchanged files and partial builds and other concerns.
    watchDelay: 100
  },

  // Allow any of the above values to be overriden
  additions,

  // And then augment the values that we want to explicitly provide
  {
    output: _.defaults({
      component: package.name,

      path: Path.join(output.path || '', output.pathPrefix || ''),
      sourceMapFilename: '[file].map'
    }, additions.output),

    linker: _.extend({
      local: false
    }, additions.linker),

    resolve: resolve(additions.resolve),
    plugins: plugins(additions.plugins),
  });

  options.components = options.components
      || Resolver.findComponents(options.checkPermutation || options.configId, options.resolve.modulesDirectories);

  checkComponents(options.components);

  return options;
}

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
    context: configs[0].context,
    target: function(compiler) {
      var bowerCopy = new BowerCopyPlugin();

      bowerCopy.apply(compiler);
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
      filename: 'circus.json',
      path: (configs[0].output || {}).path
    }
  };
}

/**
 * Checks the given components against our current circus version to prevent unexpected
 * surprises due to runtime mismatches.
 */
function checkComponents(components) {
  _.each(components, function(component, componentName) {
    if (!Semver.satisfies(component.circusVersion, '^' + package.version)) {
      throw new Error('Component ' + componentName + ' compiled with unsupported version of circus: ' + component.circusVersion);
    }
  });
}
