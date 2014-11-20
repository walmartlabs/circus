var _ = require('underscore'),
    Handlebars = require('handlebars/runtime'),
    Vendor = require('vendor');

var log = document.createElement('log');
log.info = 'App: _: ' + (!!_) + ' Handlebars: ' + (!!Handlebars) + ' Vendor: ' + (!!Vendor);
document.body.appendChild(log);
