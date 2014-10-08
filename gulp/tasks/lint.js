'use strict';

var gulp = require('gulp');
var config = require('../config');

var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var handleError = require('../util/handle-errors');

gulp.task('jshint', function() {
  var allJavascript = Array.prototype.concat(config.source, config.build, config.tests);

  return gulp.src(allJavascript)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .on('error', handleError);
});

gulp.task('lint', ['jshint']);
