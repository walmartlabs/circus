module.exports = {
  source: [
    'lib/**/*.js',
  ],
  gulp: [
    'gulp/**/*.js',
  ],
  tests: [
    'test/**/*.js',
    '!test/fixtures/**/*.js'
  ]
};
