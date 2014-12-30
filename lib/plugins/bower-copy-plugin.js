var Path = require('path'),
    RawSource = require('webpack-core/lib/RawSource');

module.exports = function() {};

module.exports.prototype.apply = function(compiler) {
  compiler.plugin('compilation', function(compilation) {
    compilation.plugin('additional-assets', function(callback) {
      var file = Path.resolve(compiler.options.context + '/bower.json');

      compiler.inputFileSystem.readFile(file, function(err, data) {
        if (err) {
          /* istanbul ignore else */
          if (err.code === 'ENOENT') {
            return callback();
          } else {
            return callback(err);
          }
        }

        compilation.assets['bower.json'] = new RawSource(data);

        callback();
      });
    });
  });
};
