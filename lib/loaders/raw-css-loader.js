// Forked from the webpack/css-loader project
/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
var csso = require("csso"),
    loaderUtils = require("loader-utils");

module.exports = function(content) {
  this.cacheable && this.cacheable();
  var query = loaderUtils.parseQuery(this.query),
      root = query.root,
      tree = csso.parse(content, "stylesheet");

  /*istanbul ignore if: Sanity check that ports over safety checks from the original fork */
  if (!tree) {
    throw new Error('Unable to parse css tree for "' + content + '"');
  }

  annotateUrls(tree);

  var css = csso.translate(tree);
  var ret = {
    modules: []
  };
  var seen = {};
  var uriRegExp = /%CSSURL\[%(.*?)%\]CSSURL%/g;
  css = css.replace(uriRegExp, function(str) {
    var match = /^%CSSURL\[%(["']?(.*?)["']?)%\]CSSURL%$/.exec(JSON.parse('"' + str + '"'));
    var url = loaderUtils.parseString(match[2]);
    if(!loaderUtils.isUrlRequest(match[2], root)) {
      return escapeString(match[1]);
    }
    var idx = url.indexOf("?#"),
        request = url,
        tail = '';
    if (url.indexOf('!') < 0) {
      if(idx < 0) { idx = url.indexOf("#"); }
      if(idx > 0) {
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
  });
  ret.source = css;

  // WARN : This needs to be double encoded for it to play nicely with webpack. Unclear why
  // but moved on in the interest of time.
  return JSON.stringify(JSON.stringify(ret));
};

function escapeString(string) {
  return JSON.stringify(string).replace(/^"|"$/g, "");
}

function annotateUrls(tree) {
  function iterateChildren() {
    for(var i = 1; i < tree.length; i++) {
      annotateUrls(tree[i]);
    }
  }
  switch(tree[0]) {
  case "stylesheet": return iterateChildren();
  case "ruleset": return iterateChildren();
  case "block": return iterateChildren();
  case "atruleb": return iterateChildren();
  case "atruler": return iterateChildren();
  case "atrulers": return iterateChildren();
  case "declaration": return iterateChildren();
  case "value": return iterateChildren();
  case "uri":
    for(var i = 1; i < tree.length; i++) {
      var item = tree[i];
      switch(item[0]) {
      /*istanbul ignore next: Ported from fork and suspect this isn't possible, but don't want to remove */
      case "ident":
      case "raw":
        item[1] = "%CSSURL[%" + item[1] + "%]CSSURL%";
        return;
      case "string":
        item[1] = "%CSSURL[%" + item[1].replace(/^["']|["']$/g, '') + "%]CSSURL%";
        return;
      }
    }
  }
}

