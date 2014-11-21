var Circus = require('circus');

Circus.router({
  routes: {
    '/foo': 'bar',
    '/bar': 'bat'
  }
});
