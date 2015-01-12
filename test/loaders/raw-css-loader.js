var rawCssLoader = require('../../lib/loaders/raw-css-loader'),
    expect = require('chai').expect;

describe('raw-css-loader', function() {
  it('should handle css parser errors', function() {
    var context = { request: 'foo.styl' };
    expect(function() {
      rawCssLoader.call(context, '.foo { background url(foo!bar) }');
    }).to.throw(/Invalid css: foo.styl:1:19.*\n +> .foo \{ background url\(foo!bar\) \}/);
    expect(function() {
      rawCssLoader.call(context, '.foo { \nbackground url(foo!bar) }\n\n');
    }).to.throw(/Invalid css: foo.styl:2:12.*\n +> background url\(foo!bar\) \}/);
  });
  it('should handle requests with loaders', function() {
    var content = JSON.parse(JSON.parse(rawCssLoader('.foo { background: url(foo!bar) }')));
    expect(content).to.eql({
      modules: [
        {id: 0, request: 'foo!bar'}
      ],
      source: '.foo {\n  background: url("%CSSURL[0]CSSURL%");\n}'
    });
  });
});
