var Pack = require('../lib'),
    webpack = require('webpack');

var childProcess = require('child_process'),
    expect = require('chai').expect,
    fs = require('fs'),
    temp = require('temp'),
    path = require('path'),
    phantom = require('phantomjs');

describe('loader integration', function() {
  var outputDir;

  beforeEach(function(done) {
    temp.mkdir('loader-plugin', function(err, dirPath) {
      if (err) {
        throw err;
      }

      outputDir = dirPath;

      var runner = fs.readFileSync(__dirname + '/client/runner.js');
      fs.writeFileSync(outputDir + '/runner.js', runner);

      done();
    });
  });
  afterEach(function() {
    temp.cleanupSync();
  });

  describe('#config', function() {
    it('should extend config', function() {
      var config = Pack.config({
        module: {
          loaders: [2]
        },
        resolve: {
          bar: 'baz'
        },
        plugins: [1]
      });
      expect(config.module.loaders.length).to.equal(2);
      expect(config.module.loaders[1]).to.equal(2);
      expect(config.resolve).to.eql({
        modulesDirectories: ['web_modules', 'node_modules', 'bower_components'],
        bar: 'baz'
      });
      expect(config.plugins.length).to.equal(3);
      expect(config.plugins[2]).to.equal(1);
    });
  });

  it('should load js+css on initial route', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/multiple-chunks.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Zeus',

        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var html = fs.readFileSync(__dirname + '/client/initial-route.html');
      fs.writeFileSync(outputDir + '/index.html', html);

      childProcess.execFile(phantom.path, [outputDir + '/runner.js', outputDir], function(err, stdout, stderr) {
        if (err) {
          throw new Error('Phantom failed code: ' + err.code + '\n\n' + stdout + '\n\n' + stderr);
        }
        expect(stderr).to.equal('');

        var loaded = JSON.parse(stdout);

        // Opposite order as the loader injects into the top of head
        expect(loaded.scripts.length).to.eql(2);
        expect(loaded.scripts[0]).to.match(/\.1\.bundle\.js$/);
        expect(loaded.scripts[1]).to.match(/\/bundle\.js$/);

        expect(loaded.styles.length).to.eql(2);
        expect(loaded.styles[0]).to.match(/\.0\.bundle\.css$/);
        expect(loaded.styles[1]).to.match(/\.1\.bundle\.css$/);

        done();
      });
    });
  });
  it('should resolve bower and npm packages', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/packages.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Zeus',

        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var html = fs.readFileSync(__dirname + '/client/initial-route.html');
      fs.writeFileSync(outputDir + '/index.html', html);

      childProcess.execFile(phantom.path, [outputDir + '/runner.js', outputDir], function(err, stdout, stderr) {
        if (err) {
          throw new Error('Phantom failed code: ' + err.code + '\n\n' + stdout + '\n\n' + stderr);
        }
        expect(stderr).to.equal('');

        var loaded = JSON.parse(stdout);

        expect(loaded.log).to.eql([
          '_: true Handlebars: true'
        ]);

        done();
      });
    });
  });
  it('should compile stylus into external css files', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/stylus.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Zeus',

        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js', '0.bundle.css']);

      // Verify the actual css content
      var output = fs.readFileSync(outputDir + '/0.bundle.css').toString();
      expect(output).to.match(/\.foo\s*\{/);
      expect(output).to.match(/\.baz\s*\{/);

      done();
    });
  });
});
