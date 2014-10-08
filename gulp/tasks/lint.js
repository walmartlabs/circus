var gulp = require('gulp');
var config = require('../config');

var plumber = require('gulp-plumber');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var handleError = require('../util/handle-errors');

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
