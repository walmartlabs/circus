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

## CSS Loading

Circus webpack builds will also generate a single CSS module for each output JS file, when CSS files are included via the `require.css` call.

```javascript
var css = require.css('./home.css');
```

When required, the css file will automatically be inserted into the document. The require call returns a reference to the HTML element that the style will be loaded through.


## Route-based Loading

Carousel also has build-time support for route-based on demand chunk loading. This allows the application to devisee a single build up into individual front end components, with only the pertinent code being loaded when the user hits that portion of the site.

### Routers

Routers are the primary execution component for Circus applications. As in generic backbone applications, they allow for specific behaviors to occur in response to the current url of the page.

```javascript
Circus.router({
  routes: {
    '/': 'home',
    '/home': 'home'
  },

  home: function(params) {
    // Respond to the route
  }
});
```

Defines a [Backbone router][backbone-router] on the routes `/` and `/home` but have the important distinction of being parse-able at build time so they may be demand loaded with the `Circus.loader` and integrated into the server routing tables for push state and SSJS support.

This does not necessarily need to be a Backbone router, and can be anything as long as the first parameter is an object with the field `routes` who's keys define routes in a manner that can be consumed by `Circus.loader`.

### Loaders

Loaders serve as entry points into routers. They will demand load a given router and it's dependencies in response to the current route on the page.

```javascript
Circus.loader([
  './home',
  './items'
]);
```

Will generate two different chunks, one for the home router and one for the items route.

Generally a loader is used for simple bootstrapping of an application, along with core libraries.

### Generated Code

The loader will generate a JavaScript construct similar to the following:

```javascript
Circus.loader(__webpack_requre__, moduleJSON);
```

and `Circus.router` calls are not modified at build time. Implementors are expected to provide their own implementations of these methods that integrates with their framework of choice.

For those who wish to use a different root object, the `Circus` name may be changed by passing a `circusNamespace` option to the `Circus.config` compiler method.

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

[backbone-router]: http://backbonejs.org/#Router
