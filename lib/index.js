var PackPlugin = require('./plugins'),
    webpack = require('webpack');

module.exports.plugins = function(additions) {
  var base = [
    new PackPlugin()
  ];

  return additions ? base.concat(additions) : base;
};
