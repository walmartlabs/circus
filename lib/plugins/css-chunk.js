var ConcatSource = require('webpack-core/lib/ConcatSource'),
    ModuleDependency = require('webpack/lib/dependencies/ModuleDependency');

module.exports = exports = function CssChunkPlugin() {};

exports.prototype.apply = function(compiler) {
  compiler.parser.plugin('call require.css', function(expr) {
    var request = this.evaluateExpression(expr.arguments[0]);
    this.state.current.addDependency(new CssDependency(request.string, this.state.module, expr.range));

    return true;
  });

  compiler.plugin('compilation', function(compilation, params) {
    var normalModuleFactory = params.normalModuleFactory;
    compilation.dependencyFactories.set(CssDependency, new CssDependency.Factory(compilation, normalModuleFactory));
    compilation.dependencyTemplates.set(CssDependency, new CssDependency.Template());

    compilation.dependencyFactories.set(CssContentDependency, normalModuleFactory);

    compilation.plugin('additional-assets', function(callback) {
      // Find all CSS modules and pull them into an associated css chunk
      this.chunks.forEach(function(chunk) {
        var cssSource = new ConcatSource(),
            foundCss;

        chunk.modules.forEach(function(module) {
          module.dependencies.forEach(function(dependency) {
            if (dependency instanceof CssDependency && dependency.text) {
              cssSource.add(dependency.text);
              foundCss = true;
            }
          });
        });

        if (foundCss) {
          this.assets[chunk.files[0].replace(/\.js$/, '.css')] = cssSource;
        }
      }, this);

      setImmediate(callback);
    });
  });
};


function CssDependency(request, module, range) {
  ModuleDependency.call(this, request);
  this.Class = CssDependency;

  this.module = module;
  this.range = range;
}
CssDependency.prototype = Object.create(ModuleDependency.prototype);
CssDependency.prototype.type = 'require.css';
CssDependency.prototype.updateHash = function(hash) {
  ModuleDependency.prototype.updateHash.call(this, hash);

  hash.update(this.module.chunks[0].id + '_css');
};

CssDependency.Template = function CssDependencyTemplate() {};
CssDependency.Template.prototype.apply = function(dep, source) {
  source.replace(dep.range[0], dep.range[1]-1, '__webpack_modules__.cs(' + dep.module.chunks[0].id + ')');
};

CssDependency.Factory = function(compilation) {
  this.compilation = compilation;
};
CssDependency.Factory.prototype.create = function(context, dependency, callback) {
  // Load the css content using our own stringifying source loader so we can get the content
  // without js parsing causing errors.
  var loader = new CssContentDependency(__dirname + '/../loaders/stringify!' + dependency.request);

  this.compilation.addModuleDependencies(dependency.module, [[loader]], this.compilation.bail, null, true, function(err) {
    if (loader.module) {
      dependency.text = JSON.parse(loader.module.source().source());

      // Ensure the we rebuild based on the dependencies loaded here
      loader.module.fileDependencies.forEach(function(dep) {
        dependency.module.fileDependencies.push(dep);
      });
    }

    callback(err);
  });
};


function CssContentDependency(request) {
  ModuleDependency.call(this, request);
  this.Class = CssContentDependency;
}
CssContentDependency.prototype = Object.create(ModuleDependency.prototype);
