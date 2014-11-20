/*
  gulpfile.js
  ===========
  Each task has been broken out into its own file in build/tasks. Any file in that folder gets
  automatically required by the loop in ./gulp/index.js (required below).

  To add a new task, simply add a new task file to ./build/tasks.
*/

var gulp = require('gulp'),
    requireDir = require('require-dir'),
    config = require('./gulp/config');

// Require all tasks in gulp/tasks, including subfolders
requireDir('./gulp/tasks', { recurse: true });

gulp.task('default', ['lint']);

gulp.task('dev', ['lint', 'test'], function() {
  gulp.watch(config.source.concat(['./test/**/*.js']), ['lint', 'test']);
});
