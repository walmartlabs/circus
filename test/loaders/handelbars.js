var webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('handlebars loader', function() {
  var outputDir;

  beforeEach(function(done) {
    temp.mkdir('loader-plugin', function(err, dirPath) {
      if (err) {
        throw err;
      }

      outputDir = dirPath;
      done();
    });
  });
  afterEach(function() {
    temp.cleanupSync();
  });

  it('should precompile', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/handlebars.hbs');

    webpack({
      entry: entry,
      output: {path: outputDir},

      module: {
        loaders: [
          { test: /\.hbs$/, loader: __dirname + '/../../lib/loaders/handlebars' }
        ]
      }
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/module\.exports = Handlebars\.template\(.*"main"/);
      expect(output).to.match(/<log info=/);

      done();
    });
  });
  it('should load dependencies', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/dependencies.hbs');

    webpack({
      context: __dirname + '/..',
      entry: entry,
      output: {path: outputDir},

      module: {
        loaders: [
          { test: /\.hbs$/, loader: __dirname + '/../../lib/loaders/handlebars?knownHelpers=bat' }
        ]
      }
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings.length).to.equal(1);
      expect(status.compilation.warnings[0].toString()).to.match(/Unable to resolve partial "not-found": .*test\/fixtures/);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/Handlebars.registerPartial\("fixtures\/handlebars.hbs", __webpack_require__/);
      expect(output).to.match(/invokePartial\(.*'fixtures\/handlebars.hbs'/);
      expect(output).to.match(/invokePartial\(.*'not-found'/);
      expect(output).to.match(/helpers.foo.call\(/);
      expect(output).to.match(/helpers.bat.call\(/);
      expect(output).to.match(/module\.exports = Handlebars\.template\(.*"main"/);
      expect(output).to.match(/"foo!"/);
      expect(output).to.match(/<log info=/);

      done();
    });
  });
});
