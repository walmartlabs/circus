// Forked from the webpack/css-loader project
/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
var rework = require('rework'),
    reworkUrl = require('rework-plugin-url'),
    loaderUtils = require('loader-utils');

module.exports = function(content) {
  if (this.cacheable) {
    this.cacheable();
  }

  var query = loaderUtils.parseQuery(this.query),
      root = query.root;

  var ret = {
    modules: []
  };
  var seen = {};
  try {
    ret.source = rework(content, {source: this.request})
        .use(reworkUrl(function(url) {
          if (!loaderUtils.isUrlRequest(url, root)) {
            return url;
          }
          var idx = url.indexOf('?#'),
              request = url,
              tail = '';
          if (url.indexOf('!') < 0) {
            if (idx < 0) { idx = url.indexOf('#'); }
            if (idx > 0) {
              // in cases like url('webfont.eot?#iefix')
              tail = url.substr(idx);
              url = url.substr(0, idx);
            }

            request = loaderUtils.urlToRequest(url, root);
          }

          if (seen[request]) {
            return '%CSSURL[' + seen[request].id + ']CSSURL%' + tail;
          }

          var module = {
            id: ret.modules.length,
            request: request
          };
          ret.modules.push(module);
          seen[request] = module;
          return '%CSSURL[' + module.id + ']CSSURL%' + tail;
        }))
        .toString();

  } catch(err) {
    var lines = content.split(/\n/g);
    throw new Error('Invalid css: ' + err.message + '\n      > ' + lines[err.line - 1]);
  }

  // WARN : This needs to be double encoded for it to play nicely with webpack. Unclear why
  // but moved on in the interest of time.
  return JSON.stringify(JSON.stringify(ret));
};
