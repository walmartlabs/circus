var Handlebars = require('handlebars'),
    fs = require('fs'),
    Path = require('path');

function loadTemplate(name) {
  var src = fs.readFileSync(Path.join(__dirname, name)).toString();
  return Handlebars.compile(src, {noEscape: true});
}

module.exports = exports = {
  bootstrap: loadTemplate('bootstrap.js.hbs')
};
