var Circus = require('../lib'),
    webpack = require('webpack');

var Chai = require('chai'),
      expect = Chai.expect,
    fs = require('fs'),
    temp = require('temp'),
    path = require('path'),
    sinon = require('sinon'),

    SourceMapResolve = require('source-map-resolve');

Chai.use(require('sinon-chai'));

describe('publish', function() {
  this.timeout(10000);

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
    if (SourceMapResolve.resolveSourceMap.restore) {
      SourceMapResolve.resolveSourceMap.restore();
    }
  });

  it('should rewrite css asset references', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/css-image.js');

    webpack(Circus.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        path: outputDir
      },

      module: {
        loaders: [
          { test: /\.gif$/, loader: require.resolve('file-loader') }
        ]
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Coverage for the string case
      fs.appendFileSync(outputDir + '/0.bundle.css', '\n .foo { background: url("e46d046421eba561b2d062319480f69a.gif"); }\n');

      var spy = sinon.spy(function(file, data, callback) {
        callback(undefined, file.replace(/\.[^.]*$/, '.foo'));
      });

      Circus.publish({
        buildDir: outputDir,
        publish: spy,
        callback: function(err) {
          expect(err).to.not.exist;

          expect(spy)
              .to.have.callCount(4)
              .to.have.been.calledWith('e46d046421eba561b2d062319480f69a.gif')
              .to.have.been.calledWith('0.bundle.css')
              .to.have.been.calledWith('bundle.js.map')
              .to.have.been.calledWith('bundle.js');

          var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json'));
          expect(output.published).to.eql({
            'e46d046421eba561b2d062319480f69a.gif': 'e46d046421eba561b2d062319480f69a.foo',
            '0.bundle.css': '0.bundle.foo',
            '0.bundle.css.map': '0.bundle.css.map',
            'bundle.js': 'bundle.foo',
            'bundle.js.map': 'bundle.js.foo'
          });

          // Check CSS content
          output = spy.args[1][1];
          expect(output).to.match(/e46d046421eba561b2d062319480f69a.foo/);
          expect(output).to.not.match(/e46d046421eba561b2d062319480f69a.gif/);

          // Check js content
          output = spy.args[3][1];
          expect(output).to.match(/bundle.js.foo/);
          expect(output).to.not.match(/bundle.js.map/);

          done();
        }
      });
    });
  });

  it('should rewrite chunk asset references', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

    webpack(Circus.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        bootstrap: true,
        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var spy = sinon.spy(function(file, data, callback) {
        callback(undefined, file.replace(/\.[^.]*$/, '.foo'));
      });

      Circus.publish({
        buildDir: outputDir,
        publish: spy,
        callback: function(err) {
          expect(err).to.not.exist;

          expect(spy)
              .to.have.callCount(4)
              .to.have.been.calledWith('1.bundle.js.map')
              .to.have.been.calledWith('1.bundle.js')
              .to.have.been.calledWith('bundle.js.map')
              .to.have.been.calledWith('bundle.js');

          var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json'));
          expect(output.published).to.eql({
            '1.bundle.js.map': '1.bundle.js.foo',
            '1.bundle.js': '1.bundle.foo',
            'bundle.js': 'bundle.foo',
            'bundle.js.map': 'bundle.js.foo'
          });

          // Check chunk content
          output = spy.args[1][1];
          expect(output).to.match(/1.bundle.js.foo/);
          expect(output).to.not.match(/1.bundle.js.map/);

          // Check js content
          output = spy.args[3][1];
          expect(output).to.match(/1.bundle.foo/);
          expect(output).to.not.match(/1.bundle.js/);

          done();
        }
      });
    });
  });

  describe('source map', function() {
    it('should provide source map locally', function(done) {
      var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

      webpack(Circus.config({
        context: path.resolve(__dirname + '/fixtures'),
        entry: entry,
        output: {
          path: outputDir
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        var spy = sinon.spy(function(file, data, callback) {
          callback(undefined, file.replace(/\.[^.]*$/, '.foo'));
        });

        Circus.publish({
          buildDir: outputDir,
          sourceMap: 'local',

          publish: spy,
          callback: function(err) {
            expect(err).to.not.exist;

            expect(spy)
                .to.have.callCount(2)
                .to.have.been.calledWith('1.bundle.js')
                .to.have.been.calledWith('bundle.js');

            var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json'));
            expect(output.published).to.eql({
              '1.bundle.js': '1.bundle.foo',
              'bundle.js': 'bundle.foo'
            });

            // Check chunk content
            output = spy.args[0][1];
            expect(output).to.not.match(/1.bundle.js.foo/);
            expect(output).to.not.match(/1.bundle.js.map/);

            output = spy.args[1][1];
            expect(output).to.not.match(/bundle.js.foo/);
            expect(output).to.not.match(/bundle.js.map/);

            expect(fs.existsSync(outputDir + '/1.bundle.js.prod.map')).to.be.true;
            expect(fs.existsSync(outputDir + '/bundle.js.prod.map')).to.be.true;

            done();
          }
        });
      });
    });

    it('should omit source map', function(done) {
      var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

      webpack(Circus.config({
        context: path.resolve(__dirname + '/fixtures'),
        entry: entry,
        output: {
          path: outputDir
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        var spy = sinon.spy(function(file, data, callback) {
          callback(undefined, file.replace(/\.[^.]*$/, '.foo'));
        });

        Circus.publish({
          buildDir: outputDir,
          sourceMap: false,

          publish: spy,
          callback: function(err) {
            expect(err).to.not.exist;

            expect(spy)
                .to.have.callCount(2)
                .to.have.been.calledWith('1.bundle.js')
                .to.have.been.calledWith('bundle.js');

            var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json'));
            expect(output.published).to.eql({
              '1.bundle.js': '1.bundle.foo',
              'bundle.js': 'bundle.foo'
            });

            // Check chunk content
            output = spy.args[0][1];
            expect(output).to.not.match(/1.bundle.js.foo/);
            expect(output).to.not.match(/1.bundle.js.map/);

            output = spy.args[1][1];
            expect(output).to.not.match(/bundle.js.foo/);
            expect(output).to.not.match(/bundle.js.map/);

            expect(fs.existsSync(outputDir + '/1.bundle.js.prod.map')).to.be.false;
            expect(fs.existsSync(outputDir + '/bundle.js.prod.map')).to.be.false;

            done();
          }
        });
      });
    });
  });

  it('should handle publish errors', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

    webpack(Circus.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var spy = sinon.spy(function(file, data, callback) {
        callback(new Error('foo'));
      });

      Circus.publish({
        buildDir: outputDir,
        sourceMap: false,

        publish: spy,
        callback: function(err) {
          expect(err).to.match(/foo/);

          done();
        }
      });
    });
  });
  it('should handle publish errors with source maps', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

    webpack(Circus.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var spy = sinon.spy(function(file, data, callback) {
        callback(new Error('foo'));
      });

      Circus.publish({
        buildDir: outputDir,

        publish: spy,
        callback: function(err) {
          expect(err).to.match(/foo/);

          done();
        }
      });
    });
  });
  it('should handle resolve source map errors', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/require-packages.js');

    sinon.stub(SourceMapResolve, 'resolveSourceMap', function(data, path, readFile, callback) {
      callback(new Error('foo'));
    });

    webpack(Circus.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var spy = sinon.spy();

      Circus.publish({
        buildDir: outputDir,

        publish: spy,
        callback: function(err) {
          expect(err).to.match(/foo/);

          done();
        }
      });
    });
  });
  it('should iterate over permutations', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/packages.js');

    webpack(Circus.config([
      {
        context: path.resolve(__dirname + '/fixtures'),
        configId: 1,
        entry: entry,
        output: {
          path: outputDir,
          pathPrefix: '1'
        }
      },
      {
        context: path.resolve(__dirname + '/fixtures'),
        configId: 2,
        entry: entry,
        output: {
          path: outputDir,
          pathPrefix: '2'
        }
      }
    ]), function(err, status) {
      expect(err).to.not.exist;
      expect(status.stats[0].compilation.errors).to.be.empty;
      expect(status.stats[0].compilation.warnings).to.be.empty;

      var spy = sinon.spy(function(file, data, callback) {
        callback(undefined, file + 'foo');
      });

      Circus.publish({
        buildDir: outputDir,
        publish: spy,
        callback: function(err) {
          expect(err).to.not.exist;

          expect(spy.callCount).to.equal(4);
          expect(spy.calledWith('1/bundle.js')).to.be.true;
          expect(spy.calledWith('1/bundle.js.map')).to.be.true;
          expect(spy.calledWith('2/bundle.js')).to.be.true;
          expect(spy.calledWith('2/bundle.js.map')).to.be.true;

          var output = JSON.parse(fs.readFileSync(outputDir + '/1/circus.json'));
          expect(output.published).to.eql({
            'bundle.js': '1/bundle.jsfoo',
            'bundle.js.map': '1/bundle.js.mapfoo'
          });

          done();
        }
      });
    });
  });
  it('should filter permutations', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/packages.js');

    webpack(Circus.config([
      {
        context: path.resolve(__dirname + '/fixtures'),
        configId: 1,
        entry: entry,
        output: {
          path: outputDir,
          pathPrefix: '1'
        }
      },
      {
        context: path.resolve(__dirname + '/fixtures'),
        configId: 2,
        entry: entry,
        output: {
          path: outputDir,
          pathPrefix: '2'
        }
      }
    ]), function(err, status) {
      expect(err).to.not.exist;
      expect(status.stats[0].compilation.errors).to.be.empty;
      expect(status.stats[0].compilation.warnings).to.be.empty;

      var spy = sinon.spy(function(file, data, callback) {
        callback(undefined, file + 'foo');
      });

      Circus.publish({
        buildDir: outputDir,
        filter: function(dir, callback) {
          callback(dir === '1');
        },
        publish: spy,
        callback: function(err) {
          expect(err).to.not.exist;

          expect(spy.callCount).to.equal(2);
          expect(spy.calledWith('1/bundle.js')).to.be.true;
          expect(spy.calledWith('1/bundle.js.map')).to.be.true;

          var output = JSON.parse(fs.readFileSync(outputDir + '/1/circus.json'));
          expect(output.published).to.eql({
            'bundle.js': '1/bundle.jsfoo',
            'bundle.js.map': '1/bundle.js.mapfoo'
          });

          done();
        }
      });
    });
  });
});
