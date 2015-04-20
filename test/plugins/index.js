var Pack = require('../../lib'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path'),
    package = require('../../package.json');

describe('pack plugin', function() {
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

  describe('external names', function() {
    it('should output all module names', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.match(/moduleExports = \{"circus":\{"circus":0,.*"handlebars\/runtime":\d+,.*\}/);

        done();
      });
    });
    it('should hide internals', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          hideInternals: true,

          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.match(/moduleExports = \{"circus":\{"circus":0\}/);

        done();
      });
    });
    it('should hide matching internals', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          hideInternals: /handlebars.*\/dist/,

          path: outputDir,
          chunkFilename: '[hash:3].[id].bundle.js'
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.match(/moduleExports = \{"circus":\{"circus":0,"fixtures\/packages":0,"fixtures\/bang":\d+,"handlebars\/runtime":\d+,"underscore":\d+\}/);

        done();
      });
    });

    it('should remap aliases', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          chunkFilename: '[id].bundle.js'
        },
        resolve: {
          alias: {
            'handlebars/runtime': './bang'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();
        expect(output).to.match(/moduleExports = \{"circus":\{"circus":0,.*"handlebars\/runtime":1,.*\}/);

        done();
      });
    });

    it('should remap custom external names', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          chunkFilename: '[id].bundle.js',
          externals: {
            'handlebars/runtime': 'foo'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify the loader boilerplate
        var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.match(/moduleExports = \{"circus":\{"circus":0,.*"foo":\d+,.*\}/);

        done();
      });
    });
    it('should give priority to custom external names', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          chunkFilename: '[id].bundle.js',
          externals: {
            'handlebars/runtime': 'fixtures/packages'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify that we aren't exporting the duplicate name
        var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
        expect(output.modules[0]).to.not.exist;

        // Verify the loader boilerplate
        output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.match(/"circus":0/);
        expect(output).to.not.match(/"fixtures\/packages":0/);
        expect(output).to.match(/"fixtures\/packages":\d+/);

        done();
      });
    });
    it('should give priority to custom external names (reverse)', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          externals: {
            'fixtures/packages': 'handlebars/runtime'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.be.empty;
        expect(status.compilation.warnings).to.be.empty;

        // Verify that we aren't exporting the duplicate name
        var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
        expect(output.modules[2]).to.not.exist;

        // Verify the loader boilerplate
        output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

        expect(output).to.not.match(/"fixtures\/packages":0/);
        expect(output).to.match(/"handlebars\/runtime":0/);

        done();
      });
    });
    it('should fail if the component name is remapped', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
        entry: entry,
        output: {
          path: outputDir,
          externals: {
            'circus': 'handlebars/runtime'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors).to.have.length(1);
        expect(status.compilation.warnings).to.be.empty;

        done();
      });
    });
    it('should fail if the an imported component module is overwritten', function(done) {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      webpack(Pack.config({
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
            published: {'bundle.js': 'bundle.js'},
            entry: 'bundle.js'
          }
        },

        output: {
          path: outputDir,
          externals: {
            'fixtures/bang': 'handlebars/runtime'
          }
        }
      }), function(err, status) {
        expect(err).to.not.exist;
        expect(status.compilation.errors[0]).to.match(/Unable to overwrite exported module "handlebars\/runtime" in component "zeus"/);

        done();
      });
    });
    it('should fail if there is a major version mismatch', function() {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      expect(function() {
        Pack.config({
          entry: entry,

          components: {
            zeus: {
              circusVersion: '1.0.0',
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

          output: {
            path: outputDir,
            externals: {
              'fixtures/bang': 'handlebars/runtime'
            }
          }
        });
      }).to.throw(/Component zeus compiled with unsupported version of circus: 1.0.0/);
    });
    it('should work with patch version mismatch', function() {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      expect(function() {
        Pack.config({
          entry: entry,

          components: {
            zeus: {
              circusVersion: package.version.replace(/\d+$/, '9999'),
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

          output: {
            path: outputDir,
            externals: {
              'fixtures/bang': 'handlebars/runtime'
            }
          }
        });
      }).to.not.throw();
    });
    it('should work with lower minor version mismatch', function() {
      var entry = path.resolve(__dirname + '/../fixtures/packages.js');

      // Note this test does not do anything when the version is *.0.0
      expect(function() {
        Pack.config({
          entry: entry,

          components: {
            zeus: {
              circusVersion: package.version.replace(/\d+\.\d+$/, '0.0'),
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

          output: {
            path: outputDir,
            externals: {
              'fixtures/bang': 'handlebars/runtime'
            }
          }
        });
      }).to.not.throw();
    });
  });

  it('should output css loader', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/css-chunk.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

      expect(output).to.match(/cssPaths = \{"circus":\["[0-9a-f]{3}\.0\.bundle\.css"]/);
      expect(output).to.match(/function cssLoader\(/);

      done();
    });
  });

  it('should handle multiple chunks', function(done) {
    var entry = path.resolve(__dirname + '/../fixtures/multiple-chunks.js');

    webpack(Pack.config({
      entry: entry,
      output: {
        path: outputDir,
        chunkFilename: '[hash:3].[chunkhash:4].[id].bundle.js'
      }
    }), function(err, status) {
      expect(err).to.not.exist;
      expect(status.compilation.errors).to.be.empty;
      expect(status.compilation.warnings).to.be.empty;

      var assets = Object.keys(status.compilation.assets);
      expect(assets[0]).to.match(/bundle.js/);
      expect(assets[1]).to.match(/[0-9a-f]{3}\.[0-9a-f]{4}\.1\.bundle\.js/);
      expect(assets[2]).to.match(/bootstrap.js/);
      expect(assets[3]).to.match(/[0-9a-f]{3}\.[0-9a-f]{4}\.0\.bundle\.css/);
      expect(assets[4]).to.match(/[0-9a-f]{3}\.[0-9a-f]{4}\.1\.bundle\.css/);
      expect(assets[5]).to.match(/circus.json/);
      expect(assets[6]).to.match(/bundle.js.map/);
      expect(assets[7]).to.match(/[0-9a-f]{3}\.[0-9a-f]{4}\.0\.bundle\.css.map/);
      expect(assets[8]).to.match(/[0-9a-f]{3}\.[0-9a-f]{4}\.1\.bundle\.js.map/);

      // Verify the loader boilerplate
      var output = fs.readFileSync(outputDir + '/bootstrap.js').toString();

      expect(output).to.match(/cssPaths = \{"circus":\["[0-9a-f]{3}\.[0-9a-f]{4}.0\.bundle\.css","[0-9a-f]{3}\.[0-9a-f]{4}\.1\.bundle\.css"\]/);
      expect(output).to.match(/jsPaths = \{"circus":\["bundle.js","[0-9a-f]{3}\.[0-9a-f]{4}\.1\.bundle\.js"\]/);

      done();
    });
  });
});
