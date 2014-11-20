var Handlebars = require('handlebars'),
    fs = require('fs');

function loadTemplate(name) {
  var src = fs.readFileSync(__dirname + '/' + name).toString();
  return Handlebars.compile(src, {noEscape: true});
}

module.exports = exports = {
  localVars: loadTemplate('local-vars.js.hbs'),
  cssLoader: loadTemplate('css-loader.js.hbs'),
  jsLoader: loadTemplate('js-loader.js.hbs'),
  jsLinker: loadTemplate('js-linker.js.hbs'),
  loaderCallback: loadTemplate('loader-callback.js.hbs'),
};
