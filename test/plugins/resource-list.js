var Pack = require('../../lib'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('resource list plugin', function() {
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

  it('should bind to proper loader aliases', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/resource-loader.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;


      var json = status.toJson();
      expect(json.assets[0].chunks).to.eql([0]);

      var assets = Object.keys(status.compilation.assets);
      expect(assets[0]).to.match(/e46d046421eba561b2d062319480f69a.gif/);
      expect(assets[1]).to.match(/bundle\.js/);
      expect(assets[2]).to.match(/bootstrap\.js/);

      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/__webpack_require__\(1\);\n.*__webpack_require__\(1\);\n.*__webpack_require__\(1\);/);
      expect(output).to.match(/__webpack_require__\.ru.*\("e46d046421eba561b2d062319480f69a.gif"\)/);

      var circus = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(circus.files).to.contain('e46d046421eba561b2d062319480f69a.gif');

      done();
    });
  });
});
