var Pack = require('../../lib'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('pack plugin', function() {
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

  describe('external names', function() {
    it('should output all module names', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();

        expect(output).to.match(/moduleExports = \{"pack":0,.*"handlebars\/runtime":\d+,.*\}/);

        done();
      });
    });
    it('should hide internals', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          hideInternals: true,

          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();

        expect(output).to.match(/moduleExports = \{"pack":0\}/);

        done();
      });
    });
    it('should hide matching internals', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          hideInternals: /handlebars.*\/dist/,

          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();

        expect(output).to.match(/moduleExports = \{"pack":0,"pack\/test\/fixtures\/packages":0,"handlebars\/runtime":\d+,"underscore":\d+\}/);

        done();
      });
    });
  });
  it('should output css loader', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/css-chunk.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.match(/cssSheets = \{\}/);
      expect(output).to.match(/cssPaths = \["349\.0\.bundle\.css"]/);
      expect(output).to.match(/__webpack_require__.cs = function\s*\(chunkId\)/);

      done();
    });
  });

  it('should handle multiple chunks', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/multiple-chunks.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[chunkhash:4].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(Object.keys(status.compilation.assets)).to.eql([
        'bundle.js',
        '871.6f49.1.bundle.js',
        '871.5885.0.bundle.css',
        '871.fd9c.1.bundle.css',
        'pack.json'
      ]);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.match(/cssSheets = \{\}/);
      expect(output).to.match(/cssPaths = \["871\.5885.0\.bundle\.css","871\.fd9c\.1\.bundle\.css"\]/);
      expect(output).to.match(/jsPaths = \[0,"871\.6f49\.1\.bundle\.js"\]/);
      expect(output).to.match(/__webpack_require__.cs = function\s*\(chunkId\)/);

      // Sanity checks to help us avoid issues if upstream changes under us
      expect(output).to.match(/var installedModules\b/);

      done();
    });
  });

  it('should not output css loader if not needed', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/router1.js');

    webpack(Pack.config({
      entry: entry,
      output: {path: outputDir}
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.not.match(/cssSheets = \{\}/);
      expect(output).to.not.match(/__webpack_require__.cs = function\(chunkId\)/);

      done();
    });
  });
});
