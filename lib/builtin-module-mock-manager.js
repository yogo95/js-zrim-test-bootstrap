
const mockRequire = require('mock-require'),
  fs = require('fs'),
  _ = require('lodash');

/**
 * Handle the built in module mocks
 * @constructor
 */
function BuiltInModuleMockManager() {
  if (!(this instanceof BuiltInModuleMockManager)) {
    return new (Function.prototype.bind.apply(BuiltInModuleMockManager, Array.prototype.concat.apply([null], arguments)))();
  }
}

/**
 * Return the path that contains mocks
 * @return {string} The path
 */
BuiltInModuleMockManager.prototype.getMocksDirPath = function () {
  return `${__dirname}/mocks`;
};

/**
 * Just a wrapper to {@link mockRequire}
 * @param {string} original The original module name
 * @param {string} mock The mock to apply
 */
BuiltInModuleMockManager.prototype.mockRequire = function (original, mock) {
  mockRequire(original, mock);
};

/**
 * Enable a mock for the given module
 * @param {string} moduleName The module name
 * @return {BuiltInModuleMockManager} itself
 * @throws {Error} If the mock failed
 */
BuiltInModuleMockManager.prototype.enable = function (moduleName) {
  this.mockRequire(moduleName, this.getMocksDirPath() + `/${moduleName}`);
  return this;
};

/**
 * @typedef {Object} BuiltInModuleMockManager.listMocks~Response
 * @property {string[]} names The module name available for mack
 */
/**
 * List the known mocks
 * @return {BuiltInModuleMockManager.listMocks~Response|Error} The response or error
 */
BuiltInModuleMockManager.prototype.listMocksSync = function () {
  try {
    const mocksDirPath = this.getMocksDirPath();
    let fileNames = fs.readdirSync(mocksDirPath);
    fileNames = _.filter(fileNames, fileName => {
      if (fileName === '.' || fileName === '..') {
        return false;
      }
      const stat = fs.statSync(`${mocksDirPath}/${fileName}`);
      return stat.isDirectory();
    });

    return {
      names: fileNames
    };
  } catch (error) {
    return error;
  }
};

exports.BuiltInModuleMockManager = module.exports.BuiltInModuleMockManager = BuiltInModuleMockManager;
