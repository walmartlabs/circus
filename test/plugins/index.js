var PackPlugin = require('../../lib/plugins'),
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

  it('should output css loader', function(done) {
    var pack = new PackPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/css-chunk.js');

    webpack({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      },

      plugins: [
        pack
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.match(/cssSheets = \{\}/);
      expect(output).to.match(/cssPaths = \["873\.0\.bundle\.css"]/);
      expect(output).to.match(/__webpack_require__.cs = function\s*\(chunkId\)/);

      done();
    });
  });

  it('should handle multiple chunks', function(done) {
    var pack = new PackPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/multiple-chunks.js');

    webpack({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[chunkhash:4].[id].bundle.js'
      },

      plugins: [
        pack
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(Object.keys(status.compilation.assets)).to.eql([
            'bundle.js', '14c.5875.1.bundle.js', '14c.5885.0.bundle.css', '14c.fd9c.1.bundle.css']);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.match(/cssSheets = \{\}/);
      expect(output).to.match(/cssPaths = \["14c\.5885.0\.bundle\.css","14c\.fd9c\.1\.bundle\.css"\]/);
      expect(output).to.match(/jsPaths = \[0,"14c\.5875\.1\.bundle\.js"\]/);
      expect(output).to.match(/__webpack_require__.cs = function\s*\(chunkId\)/);

      // Sanity checks to help us avoid issues if upstream changes under us
      expect(output).to.match(/var installedModules\b/);

      done();
    });
  });

  it('should not output css loader if not needed', function(done) {
    var pack = new PackPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/router1.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      plugins: [
        pack
      ]
    }, function(err, status) {
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
