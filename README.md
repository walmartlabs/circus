# Circus

[Webpack](http://webpack.github.io) for large teams.

Allows for distinct versioned Webpack components to link to one another at runtime, using independent builds and release schedules.

Usage:

```javascript
webpack(Circus.config({
  entry: 'file.js'
}));
```

## Linking

Circus projects are built around components that are versioned and compiled to shared locations.

These components should follow all of the [semver](http://semver.org/) rules, with the most important being breaking changes MUST increment the MAJOR version component.

Bower is used to link these packages together and enforce versioning checks. NPM may also be used, but it is generally preferred to use bower for Circus components as this will ensure there are not version incompatibilities between components.

Stored in each released package are the paths to the resources that are required for that component. This may be any arbitrary number of JavaScript or CSS files, but generally it's preferred to minimize the number of files. At build time the WebPack will resolve these paths based on the dependencies of the application and components, creating a single entry point module that is able to load all components needed for this application.

Components may be referenced using normal dependency loading with the following specific behaviors:

1. `require('component')` will load the main entry point for the component named `component`
2. `require('component/src/lib/file')` will load the module `src/lib/file` within `component`
3. `require('module')` will load the generic module named `module` from any component that defines it. Generally this is intended for system-wide modules such as `require('thorax')`, etc.

All of the above exports will automatically be available from a given component. Components that do not wish to expose anything outside of the first and second options may specificy the `options.output.hideInternals` flag. This will optimize the output of the given component by omitting the linker tables and also provide further isolation for the component, should this be desired. This value may either be `true` to omit all child modules or a regular expression which will omit any matching module names.

Component projects are resolved using the `require.moduleDependencies` webpack configuration flag. Any child directory of these paths that contains a `circus.json` declaration file (automatically build by Circus) is a candidate for linking vs. being compiled into the current build.


### Permutations

Circus is able to build and link to projects that build from the same source, yet conditionally compile to different targets. By defining custom plugins, etc, this allows for builds targeting specific environments.

Permutations are defined by passing an array of webpack configurations to `Circus.config`. Two additional pieces of data are required when creating permutations, `configId` and `pathPrefix`. The former is used to link between different permutations and the later is used to output the build artifacts in a separate folder.

```javascript
webpack(Circus.config([
  {
    entry: 'file.js',
    configId: 'browser',
    output: {
      pathPrefix: 'browser'
    },
    plugins: [
      new webpack.DefinePlugin({
        '$isHybrid': true
      })
    ]
  },
  {
    entry: 'file.js',
    configId: 'hybrid',
    output: {
      pathPrefix: 'hybrid'
    },
    plugins: [
      new webpack.DefinePlugin({
        '$isHybrid': false
      })
    ]
  }
]);
```

Would generate two different builds for the given project, one under `browser/` which targets users visiting via web browsers and one under `hybrid/` which targets users who are viewing the site via a hybrid native application.

When linking to a component that defines permutations, the `configId` value of the configuration will be used to select the permutation to link to. Should a match not be found, then the component will be ignored. When linking to a component that does not define permutations, everything will match by default.

### AMD Compatibility Mode

Circus can be configured to generate builds that can be consumed by require.js and other AMD build environments. This is done by specifying the `output.exportAMD` build flag, which will cause all exported Circus modules to be registered with the `define` API. Users of this mode will also need to specify the proper path configuration within the AMD environment in order to properly link to the shared file. The `amdPaths(config, optimizer)` helper method is provided as a mechanism to create this mapping.

## Bootstrap File

Circus will only generate one copy of it's bootstrap code for a given project. For components that are intended to be consumed by other components, a `bootstrap.js` file is generated with all of the necessary data to load the component within a test environment.

For top-level applications that users interact with directly, it's recommended that the `output.bootstrap` configuration option be set to true. This will inline the bootstrap code into the application entry point as well as optimize the output for this case. When in this mode, it is not possible for other components to import this component as a dependency.

This bootstrap logic allows for circus components to dynamically link to one another without the overhead of having multiple copies of the initialization logic or potentially loading different versions of the same component.

## CSS Loading

Circus webpack builds will also generate a single CSS module for each output JS file, when CSS files are included via the `require.css` call.

```javascript
var css = require.css('./home.css');
```

When required, the css file will automatically be inserted into the document. The require call returns a reference to the HTML element that the style will be loaded through.

## circus.json

Circus builds generate a `circus.json` file which defines all of the metadata that is associated with the current build.

By default this file contains:

- `files` All files built from the component.
- `chunks` Defines the chunk files for this component.
- `modules` List of all modules built into this component.
- `routes` Lists the routes that are served by this component, mapping them to the module that serves that particular route.
- `entry` Entry point used to link to and load this component. This may be a local path or a shared URL.

Plugins that wish to modify this file prior to output may connect to the `circus-json` plugin point:

```javascript
  compilation.plugin('circus-json', function(json) {
    json.isASpecialComponent = true;
  });
```

Consumers of the `circus.json` file must accept any additional fields that plugins may define gracefully.

## Publishing

The core Circus library provides the `publish(options)` method to easily publish a built component to whatever public server/service desired. 

Options are:
- `buildDir`: Path to build directory
- `sourceMap`: `"local"` to update the source map locally but not to publish. `false` to omit any source maps entierly. Defaults to publishing any defined source maps. 
- `publish(file, content, callback)`: Called when a particular file should be published. `callback` is of the form `callback(err, name)` where `name` is the url of the published file. This will be used to populate the `published` map key in the manifest file.
- `filter(dir, callback)`: Optional method used to prevent publishing a specific permutation. `callback(filter)` expects a boolean as the first parameter. True responses will publish that permutation.
- `callback(err, published)`: Called when all files have been published

Tasks such as minimization should be done prior to publishing, if necessary. An example gulp flow is outlined below.

```javascript
var buildDir = 'build/';

gulp.task('publish', ['build', 'minify-css', 'minify-js'], function(done) {
  Circus.publish({
    buildDir: 'build/',
    sourceMap: 'local',
    publish: function(name, data, callback) {
      publishToMyAwesomeService(name, data, callback);
    },
    callback: function(err, published) {
      console.log(published);
      done(err);
    }
  });
});

gulp.task('minify-css', ['test'], function() {
  return gulp.src('build/**/*.css')
    .pipe(cssmin())
    .pipe(gulp.dest('build/'));
});
gulp.task('minify-js', ['test'], function() {
  return gulp.src('build/**/*.js')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(sourcemaps.write('build/'))
    .pipe(gulp.dest('build/'));
});

Gulp.task('build', ['lint'], function(done) {
  var webpackConfig = require(Path.join(process.cwd(), 'webpack.config.js'));

  webpack(config, function(err, stats) {
    if (err) {
      done(err);
    }
  });
});

```

Once published to the production environment, the bulid should be published to a package manager to allow for linking to to build. The [generator-release]() can be utilized to this end:

```
yo release:publish --host=$hostName components $componentName build/
```

## Karma Adapter

When using Karma for tests, the Circus Karma adapter should be used to prevent test execution until all components have been loaded.

```javascript
  config.set({
    frameworks: ['circus', ...],
    plugins: [
      require('circus/karma'),
      ...
    ]
  });
```

The circus config should also be set to inline the bootstrap code, otherwise errors due to having multiple entry points may occur.

[generator-release]: https://github.com/walmartlabs/generator-release
