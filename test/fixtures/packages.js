var _ = require('underscore'),
    Handlebars = require('handlebars/runtime');

var log = document.createElement('log');
log.info = '_: ' + (!!_) + ' Handlebars: ' + (!!Handlebars);
document.body.appendChild(log);
