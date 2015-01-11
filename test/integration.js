var _ = require('lodash'),
    Pack = require('../lib'),
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

      var html = fs.readFileSync(__dirname + '/client/initial-route.html');
      fs.writeFileSync(outputDir + '/index.html', html);

      done();
    });
  });
  afterEach(function() {
    temp.cleanupSync();
  });

  describe('#config', function() {
    it('should extend config', function() {
      var config = Pack.config({
        resolve: {
          bar: 'baz'
        },
        plugins: [1]
      });
      expect(config.resolve).to.eql({
        modulesDirectories: ['web_modules', 'node_modules', 'bower_components'],
        bar: 'baz'
      });
      expect(config.plugins.length).to.equal(4);
      expect(config.plugins[2]).to.equal(1);
    });
  });

  it('should load js+css on initial route', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/multiple-chunks.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      runPhantom(function(err, loaded) {
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
  it('should not duplicate css', function(done) {
    var html = fs.readFileSync(__dirname + '/client/existing-link.html');
    fs.writeFileSync(outputDir + '/index.html', html);

    var entry = path.resolve(__dirname + '/fixtures/multiple-chunks.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        component: 'bundle',

        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir,
        chunkFilename: '[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      runPhantom(function(err, loaded) {
        // Opposite order as the loader injects into the top of head
        expect(loaded.scripts.length).to.eql(2);
        expect(loaded.scripts[0]).to.match(/1\.bundle\.js$/);
        expect(loaded.scripts[1]).to.match(/\/bundle\.js$/);

        expect(loaded.styles.length).to.eql(2);
        expect(loaded.styles[0]).to.match(/1\.bundle\.css$/);
        expect(loaded.styles[1]).to.match(/vendor\.css$/);

        done();
      });
    });
  });

  it('should resolve bower and npm packages', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/packages.js');

    webpack(Pack.config({
      context: path.resolve(__dirname + '/fixtures'),
      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(_.keys(status.compilation.assets).sort()).to.eql([
        'bower.json',
        'bundle.js',
        'bundle.js.map',
        'circus.json'
      ]);

      var pack = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(_.pluck(pack.modules, 'name').sort()).to.eql([
        'circus/packages',
        'handlebars/runtime',
        'handlebars/runtime/dist/cjs/handlebars.runtime',
        'handlebars/runtime/dist/cjs/handlebars/base',
        'handlebars/runtime/dist/cjs/handlebars/exception',
        'handlebars/runtime/dist/cjs/handlebars/runtime',
        'handlebars/runtime/dist/cjs/handlebars/safe-string',
        'handlebars/runtime/dist/cjs/handlebars/utils',
        'underscore'
      ]);


      pack.root = outputDir;
      Pack.loadConfigs(outputDir, function(err, configs) {
        expect(configs).to.eql({
          $default: pack
        });

        runPhantom(function(err, loaded) {
          expect(loaded.log).to.eql([
            '_: true Handlebars: true'
          ]);

          done();
        });
      });
    });
  });
  it('should run loaders for external css files', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/stylus.js');

    webpack(Pack.config({
      entry: entry,

      module: {
        loaders: [
          {test: /\.styl$/, loader: require.resolve('stylus-loader')}
        ]
      },

      output: {
        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(Object.keys(status.compilation.assets)).to.eql(['bundle.js', '0.bundle.css', 'circus.json', 'bundle.js.map']);

      // Verify the actual css content
      var output = fs.readFileSync(outputDir + '/0.bundle.css').toString();
      expect(output).to.match(/\.foo\s*\{/);
      expect(output).to.match(/\.baz\s*\{/);

      done();
    });
  });

  it('should properly rebuild on watch', function(done) {
    var entry = path.resolve(__dirname + '/fixtures/multiple-chunks.js'),
        execCount = 0;

    var watcher = webpack(Pack.config({
      watch: true,
      watchDelay: 100,

      entry: entry,
      output: {
        libraryTarget: 'umd',
        library: 'Circus',

        path: outputDir,
        chunkFilename: '[id].bundle.js'
      }
    }), function handler(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      expect(Object.keys(status.compilation.assets)).to.eql([
        'bundle.js',
        '1.bundle.js',
        '0.bundle.css',
        '1.bundle.css',
        'circus.json',
        'bundle.js.map',
        '1.bundle.js.map'
      ]);

      setTimeout(function() {
        execCount++;
        if (execCount > 1) {
          watcher.close(done);
        } else {
          // WARN: Yes we are writing to the source file in the test... this is lazy
          // and unsafe, but trying to rebuild the whole fixture tree in a temp dir is
          // expensive.
          var cssPath = path.resolve(__dirname + '/fixtures/css1.css');
          fs.writeFileSync(cssPath, fs.readFileSync(cssPath));
        }
      }, 100);
    });
  });

  describe('externals', function() {
    it('should load externals from resolved packages', function(done) {
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

          runPhantom(function(err, loaded) {
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
    it('should load externals for child chunks', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/packages.js'),
          entry = path.resolve(__dirname + '/fixtures/require-packages.js');

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

          runPhantom(function(err, loaded) {
            expect(loaded.scripts.length).to.equal(3);
            expect(loaded.scripts[0]).to.match(/1\.bundle.js$/);
            expect(loaded.scripts[1]).to.match(/vendor.js$/);
            expect(loaded.scripts[2]).to.match(/bundle.js$/);

            expect(loaded.log).to.eql([
              '_: true Handlebars: true',
              '_: true Handlebars: true'
            ]);

            done();
          });
        });
      });
    });

    it('should expose externals to amd', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js');

      var html = fs.readFileSync(__dirname + '/client/require.html');
      fs.writeFileSync(outputDir + '/index.html', html);

      var require = fs.readFileSync(__dirname + '/client/require.js');
      fs.writeFileSync(outputDir + '/require.js', require);

      var exec = fs.readFileSync(__dirname + '/fixtures/amd-exec.js');
      fs.writeFileSync(outputDir + '/exec.js', exec);

      webpack(Pack.config({
        entry: vendorEntry,
        output: {
          component: 'vendor',
          exportAMD: true,

          path: outputDir,
          filename: 'vendor.js',
          chunkFilename: '[hash:3].[id].vendor.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        runPhantom(function(err, loaded) {
          expect(loaded.scripts.length).to.equal(4);
          expect(loaded.scripts[0]).to.match(/vendor.js$/);
          expect(loaded.scripts[1]).to.match(/\.1\.vendor.js$/);
          expect(loaded.scripts[2]).to.match(/require.js$/);
          expect(loaded.scripts[3]).to.match(/exec.js$/);

          expect(loaded.log).to.eql([
            '_: true Handlebars: true',
            'App: _: true Handlebars: true Vendor: true'
          ]);

          done();
        });
      });
    });

    it('should generate amd path config', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js');

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

        var config = Pack.config({
          resolve: {
            modulesDirectories: [
              outputDir
            ]
          }
        });
        expect(Pack.amdPaths(config)).to.eql({
          'underscore': 'vendor',
          'handlebars/runtime': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars.runtime': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars/base': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars/exception': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars/runtime': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars/safe-string': 'vendor',
          'handlebars/runtime/dist/cjs/handlebars/utils': 'vendor',

          'vendor': 'vendor',
          'vendor/test/fixtures/packages': 'vendor',
          'vendor/test/fixtures/require-packages': 'vendor',

          'chunk_vendor0': 'vendor',
          'chunk_vendor1': 'vendor'
        });

        expect(Pack.amdPaths(config, true)).to.eql({
          'underscore': 'empty:',
          'handlebars/runtime': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars.runtime': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars/base': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars/exception': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars/runtime': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars/safe-string': 'empty:',
          'handlebars/runtime/dist/cjs/handlebars/utils': 'empty:',

          'vendor': 'empty:',
          'vendor/test/fixtures/packages': 'empty:',
          'vendor/test/fixtures/require-packages': 'empty:',

          'chunk_vendor0': 'empty:',
          'chunk_vendor1': 'empty:'
        });

        done();
      });
    });

    it('should properly rebuild on external change', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
          entry = path.resolve(__dirname + '/fixtures/externals.js'),
          execCount = 0;

      webpack(Pack.config({
        entry: vendorEntry,
        output: {
          component: 'vendor',

          libraryTarget: 'umd',
          library: 'Circus',

          path: outputDir + '/vendor',
          filename: 'vendor.js',
          chunkFilename: '[id].vendor.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        var watcher = webpack(Pack.config({
          watch: true,
          watchDelay: 100,

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

          expect(Object.keys(status.compilation.assets).sort()).to.eql([
            '1.vendor.js',
            '1.vendor.js.map',
            'bundle.js',
            'bundle.js.map',
            'circus.json',
            'vendor.js',
            'vendor.js.map'
          ]);

          setTimeout(function() {
            execCount++;
            if (execCount > 1) {
              var copied = fs.readFileSync(path.resolve(outputDir + '/vendor.js')).toString();
              expect(copied).to.equal('updator');

              watcher.close(done);
            } else {
              var cssPath = path.resolve(outputDir + '/vendor/vendor.js');
              fs.writeFileSync(cssPath, 'updator');
            }
          }, 100);
        });
      });
    });
    it('should load externals from resolved packages', function(done) {
      var html = fs.readFileSync(__dirname + '/client/existing-script.html');
      fs.writeFileSync(outputDir + '/index.html', html);

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
          chunkFilename: '[id].vendor.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

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

          runPhantom(function(err, loaded) {
            expect(loaded.scripts.length).to.equal(3);
            expect(loaded.scripts[0]).to.match(/1\.vendor.js$/);
            expect(loaded.scripts[1]).to.match(/vendor.js$/);
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
  });

  describe('permutations', function() {
    it('should output a config per-input', function() {
      expect(Pack.config([{}, {}]).length).to.equal(3);
    });
    it('should not output root config for 1 entry', function() {
      expect(Pack.config([{}]).length).to.equal(1);
    });
    it('should output root circus.json file', function(done) {
      var entry = path.resolve(__dirname + '/fixtures/packages.js');

      webpack(Pack.config([
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

        expect(_.keys(status.stats[0].compilation.assets).sort()).to.eql([
          'bower.json',
          'circus.json'
        ]);

        var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
        expect(output).to.eql({
          children: {
            1: '1',
            2: '2'
          }
        });

        // Validate that the permutation files exist
        var config1 = JSON.parse(fs.readFileSync(outputDir + '/1/circus.json').toString()),
            config2 = JSON.parse(fs.readFileSync(outputDir + '/2/circus.json').toString());
        config1.configId = '1';
        config1.root = outputDir + '/1';
        config2.configId = '2';
        config2.root = outputDir + '/2';

        Pack.loadConfigs(outputDir, function(err, configs) {
          expect(configs).to.eql({
            1: config1,
            2: config2
          });

          done();
        });
      });
    });
    it('should fail if permutations lack prefix or id', function(done) {
      var entry = path.resolve(__dirname + '/fixtures/packages.js');

      webpack(Pack.config([
        {
          entry: entry,
          output: {path: outputDir}
        },
        {
          entry: entry,
          output: {path: outputDir}
        }
      ]), function(err, status) {
        expect(err).to.not.exist;
        expect(status.stats[0].compilation.errors.length).to.equal(1);
        expect(status.stats[0].compilation.errors[0]).to.match(
            /Multiconfig specified without configId \(undefined\) or pathPrefix \(undefined\)/);
        expect(status.stats[0].compilation.warnings).to.be.empty;

        done();
      });
    });
    it('should link to default from permutation', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
          entry = path.resolve(__dirname + '/fixtures/externals.js');

      webpack(Pack.config({
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        webpack(Pack.config({
          configId: 1,
          entry: entry,

          output: {
            path: outputDir,
            pathPrefix: '1'
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

          var output = fs.readFileSync(outputDir + '/1/bundle.js').toString();
          expect(output).to.match(/componentNames = \["vendor"\]/);

          done();
        });
      });
    });
    it('should link to permutation from permutation', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
          entry = path.resolve(__dirname + '/fixtures/externals.js');

      webpack(Pack.config([{
        configId: 1,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '1'
        }
      }, {
        configId: 2,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '2'
        }
      }]), function(err) {
        expect(err).to.not.exist;

        webpack(Pack.config({
          configId: 1,
          entry: entry,

          output: {
            path: outputDir,
            pathPrefix: '1'
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

          var output = fs.readFileSync(outputDir + '/1/bundle.js').toString();
          expect(output).to.match(/componentNames = \["vendor"\]/);

          done();
        });
      });
    });
    it('should link between permutation with custom tracker', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
          entry = path.resolve(__dirname + '/fixtures/externals.js');

      webpack(Pack.config([{
        configId: 1,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '1'
        }
      }, {
        configId: 2,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '2'
        }
      }]), function(err) {
        expect(err).to.not.exist;

        webpack(Pack.config({
          checkPermutation: function(configId) {
            return configId === '2';
          },
          entry: entry,

          output: {
            path: outputDir,
            pathPrefix: '1'
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

          var output = fs.readFileSync(outputDir + '/1/bundle.js').toString();
          expect(output).to.match(/componentNames = \["vendor"\]/);

          done();
        });
      });
    });
    it('should ignore missing permutations', function(done) {
      var vendorEntry = path.resolve(__dirname + '/fixtures/require-packages.js'),
          entry = path.resolve(__dirname + '/fixtures/externals.js');

      webpack(Pack.config([{
        configId: 2,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '2'
        }
      }, {
        configId: 3,
        entry: vendorEntry,
        output: {
          component: 'vendor',
          path: outputDir + '/vendor',
          pathPrefix: '3'
        }
      }]), function(err) {
        expect(err).to.not.exist;

        webpack(Pack.config({
          configId: 1,
          entry: entry,

          output: {
            path: outputDir,
            pathPrefix: '1'
          },

          resolve: {
            modulesDirectories: [
              outputDir
            ]
          }
        }), function(err, status) {
          expect(err).to.not.exist;
          expect(_.pluck(status.compilation.errors, 'name')).to.eql([
            'ModuleNotFoundError',
            'ModuleNotFoundError',
            'ModuleNotFoundError'
          ]);
          expect(status.compilation.warnings).to.be.empty;

          var output = fs.readFileSync(outputDir + '/1/bundle.js').toString();
          expect(output).to.not.match(/componentNames = \["vendor"\]/);

          done();
        });
      });
    });
  });


  describe('#loadConfigs', function() {
    it('should handle root errors', function(done) {
      Pack.loadConfigs('/foo', function(err, configs) {
        expect(err).to.exist;
        expect(configs).to.not.be.ok;
        done();
      });
    });
    it('should handle child errors', function(done) {
      fs.writeFileSync(outputDir + '/circus.json', JSON.stringify({children: {bar: 'foo'}}));

      Pack.loadConfigs(outputDir, function(err, configs) {
        expect(err).to.exist;
        expect(configs).to.not.be.ok;
        done();
      });
    });
  });

  function runPhantom(callback) {
    childProcess.execFile(phantom.path, [outputDir + '/runner.js', outputDir], function(err, stdout, stderr) {
      if (err) {
        throw new Error('Phantom failed code: ' + err.code + '\n\n' + stdout + '\n\n' + stderr);
      }
      expect(stderr).to.equal('');

      var loaded = JSON.parse(stdout);
      callback(undefined, loaded);
    });
  }
});
