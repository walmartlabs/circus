var CssChunkPlugin = require('../../lib/plugins/css-chunk'),
    Circus = require('../../'),
    ModuleNotFoundError = require('webpack/lib/ModuleNotFoundError'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path'),
    package = require('../../package.json');

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

  it('should resolve urls defined in css modules', function(done) {
    var cssChunkPlugin = new CssChunkPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/css-image.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      linker: {
        local: false
      },

      module: {
        loaders: [
          { test: /\.gif$/, loader: require.resolve('file-loader') }
        ]
      },
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
      expect(Object.keys(status.compilation.assets)).to.eql(['e46d046421eba561b2d062319480f69a.gif', 'bundle.js', '0.bundle.css']);

      // Verify the actual css content
      output = fs.readFileSync(outputDir + '/0.bundle.css').toString();
      expect(output).to.match(/\.foo/);
      expect(output).to.match(/\.baz/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.gif"\);/);
      expect(output).to.match(/background: url\("data:foo"\);/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.gif#foo"\);/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.gif\?#foo"\);/);
      expect(output).to.match(/background: url\("#foo"\);/);
      expect(output).to.not.match(/undefined/);

      done();
    });
  });

  it('should import published urls from components', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/css-image.js');

    webpack(Circus.config({
      entry: entry,

      components: {
        zeus: {
          circusVersion: package.version,
          chunks: [],
          modules: {
            0: {
              chunk: 0,
              name: 'foo'
            },
            1: {
              chunk: 0,
              name: 'handlebars/runtime'
            }
          },
          published: {'e46d046421eba561b2d062319480f69a.gif': 'e46d046421eba561b2d062319480f69a.foo'},
          entry: 'bundle.js'
        }
      },
      output: {
        path: outputDir
      },

      module: {
        loaders: [
          {test: /\.gif$/, loader: 'file'}
        ]
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

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.not.match(/\.foo/);
      expect(output).to.not.match(/\.baz/);

      // Verify the file records
      expect(Object.keys(status.compilation.assets).sort()).to.eql([
        '0.bundle.css',
        'bootstrap.js',
        'bootstrap.js.map',
        'bundle.js',
        'bundle.js.map',
        'circus.json',
      ]);

      // Verify the actual css content
      output = fs.readFileSync(outputDir + '/0.bundle.css').toString();
      expect(output).to.match(/\.foo/);
      expect(output).to.match(/\.baz/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.foo"\);/);
      expect(output).to.match(/background: url\("data:foo"\);/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.foo#foo"\);/);
      expect(output).to.match(/background: url\("e46d046421eba561b2d062319480f69a.foo\?#foo"\);/);
      expect(output).to.match(/background: url\("#foo"\);/);
      expect(output).to.not.match(/undefined/);

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
      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js', '79.0.2e.bundle.7938.css']);

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
