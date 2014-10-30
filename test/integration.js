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

      outputDir = dirPath = __dirname + '/../tmp';

      var runner = fs.readFileSync(__dirname + '/client/runner.js');
      fs.writeFileSync(outputDir + '/runner.js', runner);

      done();
    });
  });
  afterEach(function() {
    temp.cleanupSync();
  });

  it('should load js+css on initial route', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/multiple-chunks.js');

    webpack({
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Zeus',

        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      },

      plugins: Pack.plugins()
    }, function(err, status) {

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
});
