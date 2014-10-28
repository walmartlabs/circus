var gulp = require('gulp'),
    config = require('../config'),

    plumber = require('gulp-plumber'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    stylish = require('jshint-stylish'),
    handleError = require('../util/handle-errors');

gulp.task('jshint', function() {
  var allJavascript = Array.prototype.concat(config.source, config.gulp, config.tests);

  return gulp.src(allJavascript)
    .pipe(plumber())
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .on('error', handleError);
});

gulp.task('jscs', function () {
  var allJavascript = Array.prototype.concat(config.source, config.gulp, config.tests);

  return gulp.src(allJavascript)
    .pipe(plumber())
    .pipe(jscs())
    .on('error', handleError);
});

gulp.task('lint', ['jshint', 'jscs']);
