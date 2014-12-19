function initMocha(files) {
  files.push({pattern: __dirname + '/src/circus-init.js', included: true, served: true, watched: false});
}

initMocha.$inject = ['config.files'];

module.exports = {
  'framework:circus': ['factory', initMocha]
};
