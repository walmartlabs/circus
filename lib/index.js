var _ = require('lodash'),
    PackPlugin = require('./plugins'),
    webpack = require('webpack');

module.exports.config = function(additions) {
  return _.extend({
    plugins: plugins(additions.plugins),

    sourcePrefix: '  '
  }, additions);
};

function plugins(additions) {
  var base = [
    new PackPlugin()
  ];

  return additions ? base.concat(additions) : base;
};
