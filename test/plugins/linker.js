var LinkerPlugin = require('../../lib/plugins/linker'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('linker plugin', function() {
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

  it('should link to external requires', function(done) {
    var linkerPlugin = new LinkerPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/packages.js');

    webpack({
      entry: entry,
      output: {path: outputDir},

      components: {
        zeus: {
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
          published: {'bundle.js': 'bundle.js'},
          entry: 'bundle.js'
        }
      },
      linker: {
        local: false
      },
      plugins: [
        linkerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors.length).to.equal(1);
      expect(status.compilation.warnings.length).to.equal(0);

      // Verify the chunk division
      expect(status.compilation.chunks.length).to.equal(1);
      expect(status.compilation.chunks[0].linkedDeps).to.eql([0]);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/__webpack_require__\.l\/\*ink\*\/\(0\)/);
      expect(output).to.match(/webpackMissingModule/);

      done();
    });
  });

  it('should handle multiple externals', function(done) {
    var linkerPlugin = new LinkerPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/require-packages.js');

    webpack({
      entry: entry,
      output: {bootstrap: true, component: 'test', path: outputDir},

      components: {
        zeus: {
          chunks: [],
          modules: {
            0: {
              chunk: 0,
              name: 'undefined'
            },
            2: {
              chunk: 0,
              name: 'underscore'
            }
          },
          published: {'bundle.js': 'bundle.js'},
          entry: 'bundle.js'
        },
        zap: {
          chunks: [],
          usedModules: [
            {component: 'zeus', name: 'underscore'}
          ],
          modules: {
            1: {
              chunk: 0,
              name: 'handlebars/runtime'
            }
          },
          published: {'bundle.js': 'bundle.js'}
        }
      },
      linker: {
      },
      plugins: [
        linkerPlugin
      ]
    }, function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors.length).to.equal(1);
      expect(status.compilation.errors[0]).to.match(/Component "zap" referenced and missing entry chunk path/);
      expect(status.compilation.warnings.length).to.equal(0);

      // Verify the chunk division
      expect(status.compilation.chunks.length).to.equal(2);
      expect(status.compilation.chunks[0].linkedDeps).to.eql([]);
      expect(status.compilation.chunks[1].linkedDeps).to.eql([0, 1]);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bundle.js').toString();
      expect(output).to.match(/linkedModules = .*"test":\[\[0,2\],\[1,1\]\]/);
      expect(output).to.match(/linkedModules = .*"zap":\[\[0,2\]\]/);

      output = fs.readFileSync(outputDir + '/1.bundle.js').toString();
      expect(output).to.match(/_ = __webpack_require__\.l\/\*ink\*\/\(0\)/);
      expect(output).to.match(/Handlebars = __webpack_require__\.l\/\*ink\*\/\(1\)/);

      done();
    });
  });

  describe('alias', function() {
    it('should alias modules', function(done) {
      testAlias({bar: 'bak'}, function(status) {
        expect(status.compilation.errors.length).to.equal(1);
        expect(status.compilation.errors[0].name).to.equal('ModuleNotFoundError');
        expect(status.compilation.warnings.length).to.equal(0);

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();
        expect(output).to.match(/moduleExports.*"bak":\d,.*"bak\/bar":\d/);
        expect(output).to.not.match(/"Bar"/);

        done();
      });
    });
    it('should be case insensitive with alias modules', function(done) {
      testAlias({Bar: 'bak'}, function(status) {
        expect(status.compilation.errors.length).to.equal(1);
        expect(status.compilation.errors[0].name).to.equal('ModuleNotFoundError');
        expect(status.compilation.warnings.length).to.equal(0);

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();
        expect(output).to.match(/moduleExports.*"bak":\d,.*"bak\/bar":\d/);
        expect(output).to.not.match(/"Bar"/);

        done();
      });
    });
    it('should alias based on length', function(done) {
      testAlias({bar: 'bak', 'bar/bar': 'bak'}, function(status) {
        expect(status.compilation.errors.length).to.equal(1);
        expect(status.compilation.errors[0].name).to.equal('ModuleNotFoundError');
        expect(status.compilation.warnings.length).to.equal(0);

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();
        expect(output).to.match(/moduleExports.*"bak":\d/);
        // This could be a bit unstable but these magic numbers are checking that the
        // bak/bar is not referenced
        expect(output).to.not.match(/linkedModules.*"alias":\[.*\[0,1\]/);

        done();
      });
    });
    it('should alias only module root', function(done) {
      testAlias({bar$: 'bak'}, function(status) {
        expect(status.compilation.errors.length).to.equal(3);
        expect(status.compilation.warnings.length).to.equal(0);

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bundle.js').toString();
        expect(output).to.match(/moduleExports.*"bak":\d/);
        // This could be a bit unstable but these magic numbers are checking that the
        // bak/bar and bar/bad modules are not referenced
        expect(output).to.not.match(/linkedModules.*"alias":\[.*\[0,[12]\]/);

        done();
      });
    });

    function testAlias(alias, callback) {
      var linkerPlugin = new LinkerPlugin(),
          entry = path.resolve(__dirname + '/../fixtures/alias.js');

      webpack({
        entry: entry,
        output: {bootstrap: true, component: 'alias', path: outputDir},

        components: {
          zeus: {
            chunks: [],
            modules: {
              0: {
                chunk: 0,
                name: 'bak'
              },
              1: {
                chunk: 0,
                name: 'bak/bar'
              },
              2: {
                chunk: 0,
                name: 'bak/bad'
              }
            },
            published: {'bundle.js': 'bundle.js'},
            entry: 'bundle.js'
          }
        },
        resolve: {
          alias: alias
        },
        linker: {
          local: false
        },
        plugins: [
          linkerPlugin
        ]
      }, function(err, status) {
        expect(err).to.not.exist;

        callback(status);
      });
    }
  });
});
