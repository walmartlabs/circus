module.exports = function(content) {
  this.cacheable(true);

  // Expose the raw content in a manner that won't trip up any js parsers
  // that are run after this loader. This is a bit hacky but allows for us to
  // relatively cleanly expose non-javascript content to plugins without the
  // module boilerplate of something like the raw loader.
  return JSON.stringify(content);
};
