var gulp = require('gulp'),
    config = require('../config'),

    istanbul = require('gulp-istanbul'),
    mocha = require('gulp-mocha');

gulp.task('test', ['lint'], function() {
  return gulp.src(config.tests, {read: false})
      .pipe(mocha());
});

gulp.task('coverage', ['lint'], function(done) {
  gulp.src(config.source)
    .pipe(istanbul())
    .on('finish', function() {
      gulp.src(config.tests, {read: false})
        .pipe(mocha())
        .pipe(istanbul.writeReports())
        .on('end', done);
    });
});
