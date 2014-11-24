var _ = require('lodash'),
    fs = require('fs'),
    Path = require('path');

/**
 * Examines all of the given directories for potential component packages.
 * The basic criteria for a component package is to have the file circus.json in it's
 * root. For each of modulesDirectories, all children will be examined for this
 * particular file.
 */
module.exports.findComponents = function(modulesDirectories) {
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
};
