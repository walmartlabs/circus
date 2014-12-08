require.ensure(['./css-chunk'], function() {
  require('./css-chunk');

  console.log('DONE');
});

require.css('./css1.css');

module.exports.router = function() {};
