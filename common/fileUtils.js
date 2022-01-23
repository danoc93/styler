/**
 * File Utils
 * Utility functions to handle files.
 */

const escapeForShell = (cmd) => {
  return '"' + cmd.replace(/(["'$`\\])/g, "\\$1") + '"';
};

module.exports = { escapeForShell };
