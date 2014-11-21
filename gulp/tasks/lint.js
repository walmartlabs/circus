var gulp = require('gulp'),
    config = require('../config'),

    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    handleError = require('../util/handle-errors');

gulp.task('jshint', function() {
  var allJavascript = Array.prototype.concat(config.source, config.gulp, config.tests);

  return gulp.src(allJavascript)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .on('error', handleError);
});

gulp.task('jscs', function() {
  return gulp.src(config.source)
    .pipe(jscs())
    .on('error', handleError);
});

gulp.task('lint', ['jshint', 'jscs']);
