var _ = require('lodash'),
    Fs = require('fs'),
    Path = require('path');

/**
 * Generates the meta configuration JSON declaration used to link builds
 * with permutations.
 */
module.exports.metaConfig = function(config) {
  var configPaths = {};

  config.forEach(function(config) {
    var configId = config.configId,
        output = config.output,
        pathPrefix = output.pathPrefix;

    if (!configId || !pathPrefix) {
      throw new Error('Multiconfig specified without configId (' + configId + ') or pathPrefix (' + pathPrefix + ')');
    }

    configPaths[configId] = pathPrefix;
  });

  return {children: configPaths};
};

/**
 * Outputs the path mappings necessary for AMD modules to load Circus components.
 */
module.exports.amdPaths = function(components, optimizer) {
  var ret = {};

  _.each(components, function(component, componentName) {
    var entry = component.entry;
    entry = optimizer ? 'empty:' : entry.replace(/\.js$/, '');

    ret[componentName] = entry;

    _.each(component.modules, function(module) {
      ret[module.name] = entry;
      ret['chunk_' + componentName + module.chunk] = entry;
    });
  });

  return ret;
};

/**
 * Examines all of the given directories for potential component packages.
 * The basic criteria for a component package is to have the file circus.json in it's
 * root. For each of modulesDirectories, all children will be examined for this
 * particular file.
 */
module.exports.findComponents = function(checkChild, modulesDirectories) {
  if (typeof checkChild !== 'function') {
    var configId = checkChild+'';
    checkChild = function(childId) {
      return configId === childId;
    };
  }

  var ret = {};
  modulesDirectories.forEach(function(directory) {
    var children = [];
    try {
      children = Fs.readdirSync(directory);
    } catch (err) {
      /* istanbul ignore if */
      if (err.code !== 'ENOENT') {
        throw new Error('Failed to enumerate modules in "' + directory + '"\n' + err.stack);
      }
    }

    children.forEach(function(child) {
      var circusPath = Path.join(directory, child, 'circus.json');
      try {
        var componentDefinition = JSON.parse(Fs.readFileSync(circusPath).toString());

        // Check to see if we have a permutations build that we will need to link to.
        if (componentDefinition.children) {
          var children = _.keys(componentDefinition.children),
              matchingChild = _.find(children, checkChild);

          var permutationPath = componentDefinition.children[matchingChild];

          // If this project does not support our permutation then we ignore it
          if (!permutationPath) {
            return;
          }

          circusPath = Path.join(directory, child, permutationPath, 'circus.json');
          componentDefinition = JSON.parse(Fs.readFileSync(circusPath).toString());
        }

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
};
