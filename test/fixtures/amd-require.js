require(['underscore', 'handlebars/runtime', 'handlebars/runtime', 'vendor'], function(_, Handlebars, foo, Vendor) {
  var log = document.createElement('log');
  log.info = 'App: _: ' + (!!_) + ' Handlebars: ' + (!!Handlebars) + ' Vendor: ' + (!!Vendor);
  document.body.appendChild(log);
});
