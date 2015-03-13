var ChunkDependenciesPlugin = require('../../lib/plugins/chunk-dependencies'),
    Pack = require('../../lib'),
    webpack = require('webpack');

var expect = require('chai').expect,
    temp = require('temp'),
    fs = require('fs'),
    path = require('path');

describe('chunk dependencies plugin', function() {
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

  it('should list bootstrap first', function(done) {
    var chunkDepdenciesPlugin = new ChunkDependenciesPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/packages.js');

    webpack(Pack.config({
      entry: entry,
      output: {path: outputDir},

      linker: {
        local: false
      },
      plugins: [
        chunkDepdenciesPlugin
      ]
    }), function(err) {
      expect(err).to.not.exist;

      var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(output.chunkDependencies).to.eql({
        circus_0: {
          css: [],
          js: [
            {href: 'bootstrap.js', id: 'circus_1'},
            {href: 'bundle.js', id: 'circus_0'},
          ]
        }
      });

      done();
    });
  });
  it('should handle inlined bootstrap first', function(done) {
    var chunkDepdenciesPlugin = new ChunkDependenciesPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/packages.js');

    webpack(Pack.config({
      entry: entry,
      output: {path: outputDir, bootstrap: true},

      linker: {
        local: false
      },
      plugins: [
        chunkDepdenciesPlugin
      ]
    }), function(err) {
      expect(err).to.not.exist;

      var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(output.chunkDependencies).to.eql({
        circus_0: {
          css: [],
          js: [
            {href: 'bundle.js', id: 'circus_0'},
          ]
        }
      });

      done();
    });
  });

  it('should link to external requires', function(done) {
    var chunkDepdenciesPlugin = new ChunkDependenciesPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/packages.js');

    webpack(Pack.config({
      entry: entry,
      output: {path: outputDir},

      components: {
        zeus: {
          chunks: [{js: 'external!', css: 'externaltoo!'}, {js: 'not this!'}],
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
        chunkDepdenciesPlugin
      ]
    }), function(err) {
      expect(err).to.not.exist;

      var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(output.chunkDependencies).to.eql({
        circus_0: {
          css: [
            {href: 'externaltoo!', id: 'zeus_0'}
          ],
          js: [
            {href: 'bootstrap.js', id: 'circus_1'},
            {href: 'external!', id: 'zeus_0'},
            {href: 'bundle.js', id: 'circus_0'},
          ]
        }
      });

      done();
    });
  });

  it('should handle multiple chunks', function(done) {
    var chunkDepdenciesPlugin = new ChunkDependenciesPlugin(),
        entry = path.resolve(__dirname + '/../fixtures/require-packages.js');

    webpack(Pack.config({
      entry: entry,
      output: {bootstrap: true, component: 'test', path: outputDir},

      components: {
        zeus: {
          chunks: [{js: 'external!', css: 'externaltoo!'}, {js: 'not this!'}],
          modules: {
            0: {
              chunk: 0,
              name: 'undefined'
            },
            2: {
              chunk: 0,
              name: 'underscore'
            },
          },
          published: {'bundle.js': 'bundle.js'},
          entry: 'bundle.js'
        },
        zap: {
          chunks: [{js: 'external!', css: 'externaltoo!'}, {js: 'not this!'}],
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
        chunkDepdenciesPlugin
      ]
    }), function(err) {
      expect(err).to.not.exist;

      var output = JSON.parse(fs.readFileSync(outputDir + '/circus.json').toString());
      expect(output.chunkDependencies).to.eql({
        test_0: {
          css: [],
          js: [
            {href: 'bundle.js', id: 'test_0'},
          ]
        },
        test_1: {
          css: [
            {href: 'externaltoo!', id: 'zap_0'}
          ],
          js: [
            {href: 'bundle.js', id: 'test_0'},
            {href: 'external!', id: 'zap_0'},
            {href: '1.bundle.js', id: 'test_1'},
          ]
        }
      });

      done();
    });
  });
});
