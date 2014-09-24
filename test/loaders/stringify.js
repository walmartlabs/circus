var webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('stringify file loader', function() {
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

  it('should flag css content as such', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/css1.css');

    webpack({
      entry: entry,
      output: {path: outputDir},

      module: {
        loaders: [
          { test: /\.css$/, loader: __dirname + '/../../lib/loaders/stringify' }
        ]
      }
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/"\.foo \{\\n  bar: baz;\\n\}\\n"/);

      done();
    });
  });
});
