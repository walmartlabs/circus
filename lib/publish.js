var _ = require('lodash'),
    Async = require('async'),

    Fs = require('fs'),
    Path = require('path'),
    recast = require('recast'),
    rework = require('rework'),
    reworkUrl = require('rework-plugin-url'),

    SourceMapResolve = require('source-map-resolve');

module.exports.publish = function(options) {
  var buildDir = options.buildDir,
      circus = JSON.parse(Fs.readFileSync(buildDir + '/circus.json').toString()),
      published = {};

  if (circus.children) {
    Async.each(_.values(circus.children), function(dir, callback) {
        if (options.filter) {
          options.filter(dir, function(publish) {
            if (publish) {
              run();
            } else {
              callback();
            }
          });
        } else {
          run();
        }

        function run() {
          module.exports.publish(_.defaults({
            buildDir: Path.join(buildDir, dir),
            prefix: dir,
            callback: function(err, childrenPublished) {
              _.each(childrenPublished, function(url, file) {
                published[Path.join(dir, file)] = url;
              });
              callback(err);
            }
          }, options));
        }
      }, function(err) {
        options.callback(err, published);
      });
    return;
  }

  Async.series([
    // Publish files that are not css, js, or source maps
    publishFiles(
      function(file) {
        return !/\.map$/.test(file)
            && !/\.css$/.test(file)
            && !/\.js$/.test(file);
      }),

    // Publish css files
    publishFiles(
      function(file) {
        return /\.css$/.test(file);
      },
      processCSS),

    // Publish non-entry js files
    publishFiles(
      function(file) {
        return /\.js$/.test(file) && file !== circus.entry;
      },
      processJS),

    // Publish entry file. This must go last as it could have references to
    // anu of the above files.
    publishFiles(
      function(file) {
        return file === circus.entry;
      },
      processJS)
  ], function(err) {
    /*istnabul ignore if */
    if (err) {
      return options.callback(err);
    }

    Fs.writeFile(buildDir + '/circus.json', JSON.stringify(circus, undefined, '  '), function(err) {
      options.callback(err, published);
    });
  });

  function processCSS(file, data, callback) {
    // Replace any url references to the above
    data = updateUrls(circus.published, data + '');

    callback(undefined, data);
  }
  function processJS(file, data, callback) {
    // Preemptively kill the sourcemap published entry
    circus.published[file + '.map'] = undefined;

    if (options.sourceMap !== false) {
      SourceMapResolve.resolveSourceMap(data + '', Path.resolve(buildDir, file), Fs.readFile, function(err, sourceMap) {
        // Transform embedded urls using resolve
        var ast = recast.parse(data, {sourceFileName : file});

        recast.visit(ast, {
          visitLiteral: function(path) {
            // Replace literal file references
            if (circus.published.hasOwnProperty(path.value.value)) {
              path.value.value = circus.published[path.value.value];
            }
            return path.value;
          }
        });

        var output = recast.print(ast, {
          sourceMapName: sourceMap && sourceMap.sourceMappingURL,
          inputSourceMap: sourceMap && sourceMap.map
        });

        var mapSource = JSON.stringify(output.map);
        Fs.writeFile(Path.join(buildDir, file + '.prod.map'), mapSource, function(err) {
          /*istanbul ignore if */
          if (err) {
            return callback(err);
          }

          if (options.sourceMap !== 'local') {
            var relativeFile = Path.join(options.prefix || '', file + '.map');
            options.publish(relativeFile, mapSource, function(err, name) {
              circus.published[file + '.map'] = name;
              published[file + '.map'] = name;

              var source = output.code;
              source = source.replace(/sourceMappingURL=.*/, 'sourceMappingURL=' + name);
              callback(undefined, source);
            });
          } else {
            // Strip out any source map comment
            callback(undefined, stripSourceMap(output.code));
          }
        });
      });
    } else {
      // Strip out any source map comment
      callback(undefined, stripSourceMap(data));
    }
  }

  function stripSourceMap(source) {
    source = source + '';
    return source.replace(/.*sourceMappingURL=.*$/, '');
  }

  function publishFiles(filter, preprocessor) {
    preprocessor = preprocessor || function(file, data, callback) { callback(undefined, data); };

    return function(callback) {
      var files = _.filter(circus.files, filter);

      Async.each(files, function(file, callback) {
        Fs.readFile(Path.join(buildDir, file), function(err, data) {
          /*istanbul ignore if */
          if (err) {
            return callback(err);
          }

          preprocessor(file, data, function(err, data) {
            /*istanbul ignore if */
            if (err) {
              return callback(err);
            }

            var relativeFile = Path.join(options.prefix || '', file);
            options.publish(relativeFile, data, function(err, name) {
              if (err) {
                return callback(err);
              }

              circus.published[file] = name;
              published[file] = name;
              callback();
            });
          });
        });
      },
      callback);
    };
  }
};


// Via https://github.com/webpack/css-loader/blob/982f37476d51655d4ac017a70b77eed2d3698adf/index.js#L134
/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
function updateUrls(published, content) {
  return rework(content)
      .use(reworkUrl(function(value) {
        var tail = '';
        if (/^([^?#]*)([\?#].*?)$/.exec(value)) {
          value = RegExp.$1;
          tail = RegExp.$2;
        }
        return published[value] ? published[value] + tail : value;
      }))
      .toString();
}
