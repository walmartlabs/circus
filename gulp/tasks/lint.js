var gulp = require('gulp'),
    config = require('../config'),

    eslint = require('gulp-eslint');

gulp.task('eslint', function() {
  var allJavascript = Array.prototype.concat(config.source, config.gulp, config.tests);

  return gulp.src(allJavascript)
    .pipe(eslint())
    .pipe(eslint.format('stylish'))
    .pipe(eslint.failAfterError());
});

gulp.task('lint', ['eslint']);
