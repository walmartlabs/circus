require.ensure(['./css-chunk'], function() {
  require('./css-chunk');
});

require.css('./css1.css');

module.exports.router = function() {};
