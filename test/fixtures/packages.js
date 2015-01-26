var _ = require('underscore'),
    Handlebars = require('handlebars/runtime'),
    Handlebars = require('handlebars/runtime'),
    Bang = require('!./bang');

var log = document.createElement('log');
log.info = '_: ' + (!!_) + ' Handlebars: ' + (!!Handlebars);
document.body.appendChild(log);

console.log('DONE');
