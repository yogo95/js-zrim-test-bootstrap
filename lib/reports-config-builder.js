const _ = require('lodash');

/**
 * The configuration builder for the reports part
 * @constructor
 */
function ReportsConfigBuilder(parent) {
  if (!(this instanceof ReportsConfigBuilder)) {
    return new (Function.prototype.bind.apply(ReportsConfigBuilder, Array.prototype.concat.apply([null], arguments)))();
  }

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    parent: parent,
    configuration: this._defaultConfiguration()
  });
}

Object.defineProperty(ReportsConfigBuilder.prototype, "_subConfigurationGroupName", {
  value: 'reports',
  enumerable: false,
  writable: true
});

// Define the property container
Object.defineProperty(ReportsConfigBuilder.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});

/**
 * Returns the default configuration
 * @return {Object} The default configuration
 * @private
 */
ReportsConfigBuilder.prototype._defaultConfiguration = function () {
  return _.cloneDeep({
    rootDirectoryPath: undefined
  });
};

/**
 * Reset the internal data
 * @return {ReportsConfigBuilder} itself
 */
ReportsConfigBuilder.prototype.clear = function () {
  this.properties.configuration = this._defaultConfiguration();
  return this;
};

/**
 * Set root directory path
 * @param {string|undefined} [value] The new type
 * @return {ReportsConfigBuilder} itself
 */
ReportsConfigBuilder.prototype.rootDirectoryPath = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.rootDirectoryPath = this._defaultConfiguration().rootDirectoryPath;
  } else if (_.isString(value)) {
    this.properties.configuration.rootDirectoryPath = value;
  }

  return this;
};

/**
 * Returns the parent configuration
 * @return {TestLauncherConfigBuilder} the parent builder
 */
ReportsConfigBuilder.prototype.parentBuilder = function () {
  return this.properties.parent;
};

/**
 * Build the configuration
 * @return {Object} The configuration
 */
ReportsConfigBuilder.prototype.build = function () {
  const userConfig = {
    rootDirectoryPath: this.properties.configuration.rootDirectoryPath
  };

  return _.merge({}, userConfig);
};


exports.ReportsConfigBuilder = module.exports.ReportsConfigBuilder = ReportsConfigBuilder;
