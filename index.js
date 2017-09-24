/**
 * Main entry point for the module
 */


exports.TestLauncher = module.exports.TestLauncher = require('./lib/test-launcher').TestLauncher;
exports.TestLauncherConfigBuilder = module.exports.TestLauncherConfigBuilder = require('./lib/test-launcher-config-builder').TestLauncherConfigBuilder;
exports.BuiltInModuleMockManager = module.exports.BuiltInModuleMockManager = require("./lib/builtin-module-mock-manager").BuiltInModuleMockManager;

// Utilities
exports.mockRequire = module.exports.mockRequire = require('mock-require');


