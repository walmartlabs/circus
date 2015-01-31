var Pack = require('../lib'),
    webpack = require('webpack');

var childProcess = require('child_process'),
    expect = require('chai').expect,
    fs = require('fs'),
    temp = require('temp'),
    path = require('path'),
    phantom = require('phantomjs');

describe('bootstrap', function() {
  var outputDir;

  beforeEach(function(done) {
    temp.mkdir('loader-plugin', function(err, dirPath) {
      if (err) {
        throw err;
      }

      outputDir = dirPath;

      var runner = fs.readFileSync(__dirname + '/client/runner.js');
      fs.writeFileSync(outputDir + '/runner.js', runner);

      var html = fs.readFileSync(__dirname + '/client/initial-route.html');
      fs.writeFileSync(outputDir + '/index.html', html);

      done();
    });
  });
  afterEach(function() {
    temp.cleanupSync();
  });

  it('should emit a bootstrap file', function(done) {
    var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
        entry = path.resolve(__dirname + '/fixtures/externals.js');

    webpack(Pack.config({
      entry: vendorEntry,
      output: {
        component: 'vendor',

        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir + '/vendor',
        filename: 'vendor.js',
        chunkFilename: '[hash:3].[id].vendor.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the bootstrap
      var output = fs.readFileSync(outputDir + '/vendor/bootstrap.js').toString();
      expect(output).to.match(/componentPaths = \{"vendor":"vendor.js"\}/);

      webpack(Pack.config({
        entry: entry,

        output: {
          path: outputDir,
          filename: 'bundle.js'
        },

        resolve: {
          modulesDirectories: [
            outputDir
          ]
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the bootstrap
        output = fs.readFileSync(outputDir + '/bootstrap.js').toString();
        expect(output).to.match(/componentPaths = \{"vendor":"vendor.js","circus":"bundle.js"\}/);

        runPhantom(function(err, loaded) {
          expect(err).to.not.exist;

          expect(loaded.scripts.length).to.equal(4);
          expect(loaded.scripts[0]).to.match(/bundle.js$/);
          expect(loaded.scripts[1]).to.match(/vendor.js$/);
          expect(loaded.scripts[2]).to.match(/\.1\.vendor.js$/);
          expect(loaded.scripts[3]).to.match(/bootstrap.js$/);

          expect(loaded.log).to.eql([
            '_: true Handlebars: true',
            'App: _: true Handlebars: true Vendor: true'
          ]);

          done();
        });
      });
    });
  });

  it('should inline the bootstrap file', function(done) {
    var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
        entry = path.resolve(__dirname + '/fixtures/externals.js');

    var html = fs.readFileSync(__dirname + '/client/inlined-bootstrap.html');
    fs.writeFileSync(outputDir + '/index.html', html);

    webpack(Pack.config({
      entry: vendorEntry,
      output: {
        component: 'vendor',

        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir + '/vendor',
        filename: 'vendor.js',
        chunkFilename: '[hash:3].[id].vendor.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the bootstrap
      var output = fs.readFileSync(outputDir + '/vendor/bootstrap.js').toString();
      expect(output).to.match(/componentPaths = \{"vendor":"vendor.js"\}/);

      webpack(Pack.config({
        entry: entry,

        output: {
          bootstrap: true,

          path: outputDir,
          filename: 'bundle.js'
        },

        resolve: {
          modulesDirectories: [
            outputDir
          ]
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the bootstrap
        output = fs.readFileSync(outputDir + '/bundle.js').toString();
        expect(output).to.match(/componentPaths = \{"vendor":"vendor.js"\}/);

        runPhantom(function(err, loaded) {
          expect(err).to.not.exist;

          expect(loaded.scripts.length).to.equal(3);
          expect(loaded.scripts[0]).to.match(/vendor.js$/);
          expect(loaded.scripts[1]).to.match(/\.1\.vendor.js$/);
          expect(loaded.scripts[2]).to.match(/bundle.js$/);

          expect(loaded.log).to.eql([
            '_: true Handlebars: true',
            'App: _: true Handlebars: true Vendor: true'
          ]);

          done();
        });
      });
    });
  });

  function runPhantom(callback) {
    childProcess.execFile(phantom.path, [outputDir + '/runner.js', outputDir], function(err, stdout, stderr) {
      if (err) {
        return callback(new Error('Phantom failed code: ' + err.code + '\n\n' + stdout + '\n\n' + stderr));
      }
      expect(stderr).to.equal('');

      var loaded = JSON.parse(stdout);
      callback(undefined, loaded);
    });
  }
});
