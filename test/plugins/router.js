var RoutersPlugin = require('../../lib/plugins/router'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('router plugin', function() {
  var outputDir;

  beforeEach(function(done) {
    temp.mkdir('router-plugin', function(err, dirPath) {
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

  it('should extract metadata', function(done) {
    var routerPlugin = new RoutersPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/router1.js');

    webpack({
      entry: entry,
      output: {path: outputDir},
      circusNamespace: 'Circus',

      plugins: [
        routerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(routerPlugin.routeMap[entry]).to.eql([
        '/foo',
        '/bar'
      ]);

      done();
    });
  });
  it('should warn for missing metadata', function(done) {
    var routerPlugin = new RoutersPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/router-no-routes.js');

    webpack({
      entry: entry,
      output: {path: outputDir},
      circusNamespace: 'Circus',

      plugins: [
        routerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings.length).to.equal(2);
      expect(status.compilation.warnings[0]).to.match(/router-no-routes.js:1 - No routes/);
      expect(status.compilation.warnings[1]).to.match(/router-no-routes.js:5 - No routes/);

      expect(routerPlugin.routeMap[entry]).to.not.exist;

      done();
    });
  });
  it('should NOP for no router definition', function(done) {
    var routerPlugin = new RoutersPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/eval-router.js');

    webpack({
      entry: entry,
      output: {path: outputDir},
      circusNamespace: 'Circus',

      plugins: [
        routerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;
      expect(routerPlugin.routeMap[entry]).to.not.exist;

      done();
    });
  });

  it('should extract metadata with explicit import', function(done) {
    var routerPlugin = new RoutersPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/router-imported.js');

    webpack({
      entry: entry,
      output: {path: outputDir},
      circusNamespace: 'Circus',

      externals: {
        'circus': 'Circus'
      },
      plugins: [
        routerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(routerPlugin.routeMap[entry]).to.eql([
        '/foo',
        '/bar'
      ]);

      done();
    });
  });
  it('should handle typeof', function(done) {
    var routerPlugin = new RoutersPlugin();

    webpack({
      entry: __dirname + '/../fixtures/eval-router.js',
      output: {path: outputDir},
      circusNamespace: 'Circus',

      plugins: [
        routerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var output = fs.readFileSync(outputDir + '/bundle.js').toString();

      expect(output).to.match(/\(true\)/);
      expect(output).to.match(/"function";/);

      done();
    });
  });
});
