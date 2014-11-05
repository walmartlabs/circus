var _ = require('lodash'),
    Async = require('async'),
    Handlebars = require('handlebars'),
      Visitor = Handlebars.Visitor,
    LoaderUtils = require('loader-utils'),
    Path = require('path');

module.exports = function(content) {
  var callback = this.async();
  this.cacheable(true);

  var query = LoaderUtils.parseQuery(this.query),
      helpersDir = query.helpersDir || './src/lib/helpers/',
      templateExtension = query.extension || '.hbs',
      externalKnown = {};

  (query.knownHelpers || '').split(',').forEach(function(helper) {
    externalKnown[helper] = true;
  });

  var self = this,
      ast = Handlebars.parse(content),
      scanner = new ImportScanner(),

      knownHelpers = {};

  // Do the first phase of the parse
  scanner.accept(ast);

  var prelude = [
    'var Handlebars = require("handlebars/runtime")["default"];\n'
  ];
  function lookupPartials(callback) {
    Async.forEach(scanner.partials, function(partial, callback) {
        var request = partial.request;

        self.resolve(self.context, request + templateExtension, function(err, result) {
          if (err || !result) {
            self.emitWarning('Unable to resolve partial "' + request + '": ' + err);
          } else {
            // Attempt to generate a unique partial name
            var partialName = Path.relative(self._compiler.context, result);

            prelude.push(
                'Handlebars.registerPartial('
                  + JSON.stringify(partialName)
                  + ', require("' + result + '"));\n');

            // Update the AST for the unique name that we generated
            partial.name.name = partialName;
          }

          callback();
        });
      },
      callback);
  }
  function lookupHelpers(callback) {
    Async.forEach(_.uniq(scanner.potentialHelpers), function(helper, callback) {
        if (knownHelpers[helper] || externalKnown[helper]) {
          callback();
        } else {
          self.resolve(self._compiler.context, helpersDir + helper, function(err, result) {
            if (!err) {
              knownHelpers[helper] = true;

              prelude.push('require("' + result + '");\n');
            }

            callback();
          });
        }
      },
      callback);
  }

  Async.parallel([
      lookupPartials,
      lookupHelpers
    ],
    function() {
      // Render the AST to the final script
      var template = Handlebars.precompile(ast, {
        knownHelpersOnly: true,
        knownHelpers: _.extend(knownHelpers, externalKnown)
      });
      callback(undefined, prelude.join('') + '\nmodule.exports = Handlebars.template(' + template + ')');
    });
};



function ImportScanner() {
  this.partials = [];
  this.potentialHelpers = [];
}
ImportScanner.prototype = new Visitor();

ImportScanner.prototype.sexpr = function(sexpr) {
  var id = sexpr.id;
  if (id.isSimple) {
    this.potentialHelpers.push(id.original);
  }

  Visitor.prototype.sexpr.call(this, sexpr);
};
ImportScanner.prototype.partial = function(partial) {
  this.partials.push({request: partial.partialName.name, name: partial.partialName});

  Visitor.prototype.partial.call(this, partial);
};
