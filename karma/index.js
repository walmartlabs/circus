function init(files) {
  files.push({pattern: __dirname + '/src/circus-init.js', included: true, served: true, watched: false});
}

init.$inject = ['config.files'];

module.exports = {
  'framework:circus': ['factory', init]
};
