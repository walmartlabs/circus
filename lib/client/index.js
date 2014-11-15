var Handlebars = require('handlebars'),
    fs = require('fs');

function loadTemplate(name) {
  var src = fs.readFileSync(__dirname + '/' + name).toString();
  return Handlebars.compile(src, {noEscape: true});
}

module.exports = exports = {
  cssLoader: loadTemplate('css-loader.js.hbs'),
  jsLoader: loadTemplate('js-loader.js.hbs'),
  loaderCallback: loadTemplate('loader-callback.js.hbs'),
};
