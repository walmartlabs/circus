# Zeus Pack

Webpack Builder For Zeus Projects

## Routers

Routers are the primary exeuction component for Zeus applications. As in generic backbone applications, they allow for specific behaviors to occur in response to the current url of the page.

```javascript
Zeus.router({
  routes: {
    '/': 'home',
    '/home': 'home'
  },

  home: function(params) {
    // Respond to the route
  }
});
```

Defines a [Backbone router][backbone-router] on the routes `/` and `/home` but have the important distinction of being parse-able at build time so they may be demand loaded with the `Zeus.loader` and integrated into the server routing tables for push state and SSJS support.

Zeus routers do differ from generic backbone routes as their parameters are parsed using [backbone-query-parameters][backbone-query-parameters]'s named route parameters, so all arguments, path or query, are included in the single `params` argument for route handlers.

## Loaders

Loaders serve as entry points into routers. They will demand load a given router and it's dependencies in response to the current route on the page.

```javascript
Zeus.loader([
  './home',
  './items'
]);
```

Will generate two different chunks, one for the home router and one for the items route.

Generally a loader is used for simple bootstrapping of an application, along with the Zeus core library.


[backbone-router]: http://backbonejs.org/#Router
[backbone-query-parameters]: https://github.com/jhudson8/backbone-query-parameters
