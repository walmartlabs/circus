var gulp = require('gulp'),
    config = require('../config'),

    istanbul = require('gulp-istanbul'),
    mocha = require('gulp-mocha'),
    plumber = require('gulp-plumber');

gulp.task('test', function() {
  return gulp.src(config.tests, {read: false})
      .pipe(plumber())
      .pipe(mocha());
});

gulp.task('coverage', function(done) {
  gulp.src(config.source)
    .pipe(istanbul())
    .on('finish', function() {
      gulp.src(config.tests, {read: false})
        .pipe(plumber())
        .pipe(mocha())
        .pipe(istanbul.writeReports())
        .on('end', done);
    });
});
