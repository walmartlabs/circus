require.config({
  paths: {
    'underscore': 'vendor',
    'handlebars/runtime': 'vendor',
    'vendor': 'vendor',

    'chunk_vendor0': 'vendor',
    'chunk_vendor1': 'vendor'
  }
});

require(['underscore', 'handlebars/runtime', 'vendor'], function(_, Handlebars, Vendor) {
  var log = document.createElement('log');
  log.info = 'App: _: ' + (!!_) + ' Handlebars: ' + (!!Handlebars) + ' Vendor: ' + (!!Vendor);
  document.body.appendChild(log);
});
