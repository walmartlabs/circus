# Circus

External Webpack Component Plugin

Allows for distinct versioned Webpack components to link to one another at runtime. Allows for code to be generated an served from a shared location while still allowing flexibility in component release cycles.

```javascript
webpack(Circus.config({
  entry: 'file.js'
}));
```

## Linking

Circus projects are built around components that are versioned and compiled to shared locations.

These components should follow all of the [semver](http://semver.org/) rules, with the most important being breaking changes MUST increment the MAJOR version component.

Bower is used to link these packages together and enforce versioning checks. NPM may also be used, but it is generally preferred to us bower for Circus components as this will ensure there are not version incompatibilities between components.

Stored in each released package are the paths to the resources that are required for that component. This may be any arbitrary number of JavaScript or CSS files, but generally it's preferred to minimize the number of files. At build time the WebPack will resolve these paths based on the dependencies of the application and components, creating a single entry point module that is able to load all components needed for this application.

Components may be referenced using normal dependency loading with the following specific behaviors:

1. `require('component')` will load the main entry point for the component named `component`
2. `require('component/src/lib/file')` will load the module `src/lib/file` within `component`
3. `require('module')` will load the generic module named `module` from any component that defines it. Generally this is intended for system-wide modules such as `require('thorax')`, etc.

All of the above exports will automatically be available from a given component. Components that do not wish to expose anything outside of the first and second options may specific the `options.output.hideInternals` flag. This will optimize the output of the given component by omitting the linker tables and also provide further isolation for the component, should this be desired. This value may either be `true` to omit all child modules or a regular expression which will omit any matching module names.



## Routers

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

## Loaders

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

```javascript
Circus.loader(__webpack_requre__, moduleJSON);
```

## CSS Loading

Circus webpack builds will also generate a single CSS module for each output JS file, when CSS files are included via the `require.css` call.

```javascript
var css = require.css('./home.styl');
```

When required, the css file will automatically be inserted into the document. The require call returns a reference to the HTML element that the style will be loaded through.


## Handlebars Compilation

Handlebars templates will be precompiled upon being required. Any partials referenced in the templates will automatically be resolved and included in the module output.

Helpers that are in *src/lib/helpers/* or exported through an external library will also be automatically linked using the `knownHelpers` precompilation option.




[backbone-router]: http://backbonejs.org/#Router
