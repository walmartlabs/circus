var CssChunkPlugin = require('../../lib/plugins/css-chunk'),
    ModuleNotFoundError = require('webpack/lib/ModuleNotFoundError'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('css chunk plugin', function() {
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

  it('should merge css modules into a single file per-chunk', function(done) {
    var cssChunkPlugin = new CssChunkPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/css-chunk.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      plugins: [
        cssChunkPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.not.match(/\.foo/);
      expect(output).to.not.match(/\.baz/);

      // Verify the file records
      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js', '0.bundle.css']);

      // Verify the actual css content
      output = fs.readFileSync(outputDir + '/0.bundle.css').toString();
      expect(output).to.match(/\.foo/);
      expect(output).to.match(/\.baz/);

      done();
    });
  });

  it('should include chunk hash in the path name', function(done) {
    var cssChunkPlugin = new CssChunkPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/css-chunk.js');

    webpack({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:2].[id].[chunkhash:2].bundle.[hash:4].js'
      },

      plugins: [
        cssChunkPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the file records
      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js', 'ca.0.fd.bundle.ca25.css']);

      done();
    });
  });

  it('should nop without css content', function(done) {
    var cssChunkPlugin = new CssChunkPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/router1.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      plugins: [
        cssChunkPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.not.match(/\.foo/);
      expect(output).to.not.match(/\.baz/);

      // Verify the file records
      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js']);

      done();
    });
  });

  it('should handled erroring dependencies', function(done) {
    var cssChunkPlugin = new CssChunkPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/css-missing.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      plugins: [
        cssChunkPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors[0]).to.be.instanceof(ModuleNotFoundError);
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.not.match(/\.foo/);
      expect(output).to.not.match(/\.baz/);

      // Verify the file records
      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js']);

      done();
    });
  });
});
