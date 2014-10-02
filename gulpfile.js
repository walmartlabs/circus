'use strict';

/*
  gulpfile.js
  ===========
  Each task has been broken out into its own file in build/tasks. Any file in that folder gets
  automatically required by the loop in ./gulp/index.js (required below).

  To add a new task, simply add a new task file to ./build/tasks.
*/

var requireDir = require('require-dir');

// Require all tasks in gulp/tasks, including subfolders
requireDir('./build/tasks', { recurse: true });
