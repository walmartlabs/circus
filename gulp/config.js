module.exports = {
  source: [
    'lib/**/*.js',
  ],
  gulp: [
    'gulp/**/*.js',
  ],
  tests: [
    'test/**/*.js',
    '!test/client/**/*.js',
    '!test/fixtures/**/*.js'
  ]
};
