const _ = require('lodash');

/**
 * The configuration builder for the coverage part
 * @constructor
 */
function CoverageConfigBuilder(parent) {
  if (!(this instanceof CoverageConfigBuilder)) {
    return new (Function.prototype.bind.apply(CoverageConfigBuilder, Array.prototype.concat.apply([null], arguments)))();
  }

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    parent: parent,
    configuration: this._defaultConfiguration()
  });
}

Object.defineProperty(CoverageConfigBuilder.prototype, "_subConfigurationGroupName", {
  value: 'coverage',
  enumerable: false,
  writable: true
});

// Define the property container
Object.defineProperty(CoverageConfigBuilder.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});


/**
 * Returns the default configuration
 * @return {Object} The default configuration
 * @private
 */
CoverageConfigBuilder.prototype._defaultConfiguration = function () {
  return {
    enabled: true,
    reportDirectory: 'coverage',
    excludePatterns: ['**/test/**', '**/node_modules/**', '**.spec.js'],
    nativeConfiguration: {}
  };
};

/**
 * Reset the internal data
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.clear = function () {
  this.properties.configuration = this._defaultConfiguration();
  return this;
};

/**
 * Enable the coverage
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.enable = function () {
  this.properties.configuration.enabled = true;
  return this;
};

/**
 * Disable the coverage
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.disable = function () {
  this.properties.configuration.enabled = false;
  return this;
};

/**
 * Change the coverage value
 * @param {boolean} value true to enable, false to disable
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.setEnabled = function (value) {
  this.properties.configuration.enabled = !!value;
  return this;
};

/**
 * Set the directory name for the coverage report
 * @param {string|undefined} [value] The directory name
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.reportDirectory = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.reportDirectory = this._defaultConfiguration().reportDirectory;
  } else if (_.isString(value)) {
    this.properties.configuration.reportDirectory = value;
  }

  return this;
};

/**
 * Set the excludes patterns
 * @param {string[]|string|undefined} [value] The patterns to exclude
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.excludePatterns = function (value) {
  if (_.isArray(value)) {
    this.properties.configuration.excludePatterns = _.filter(value, item => _.isString(item));
  } else if (_.isString(value)) {
    this.properties.configuration.excludePatterns = [value];
  } else if (_.isNil(value)) {
    this.properties.configuration.excludePatterns = this._defaultConfiguration().excludePatterns;
  }

  return this;
};

/**
 * Set the excludes patterns
 * @param {string[]|string|undefined} [value] The patterns to exclude
 * @return {CoverageConfigBuilder} itself
 */
CoverageConfigBuilder.prototype.addExcludePatterns = function (value) {
  if (_.isArray(value) || _.isString(value)) {
    this.properties.configuration.excludePatterns = _.concat(this.properties.configuration.excludePatterns, value);
  }

  return this;
};

/**
 * Set the native configuration to use. The native configuration is merged with the data
 * @param {Object|undefined} [value] The native configuration
 * @return {CoverageConfigBuilder} the parent builder
 */
CoverageConfigBuilder.prototype.nativeConfiguration = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.nativeConfiguration = this._defaultConfiguration().nativeConfiguration;
  } else if (_.isObject(value)) {
    this.properties.configuration.nativeConfiguration = value;
  }

  return this;
};

/**
 * Returns the parent configuration
 * @return {TestLauncherConfigBuilder} the parent builder
 */
CoverageConfigBuilder.prototype.parentBuilder = function () {
  return this.properties.parent;
};

/**
 * Build the configuration
 * @return {Object} The configuration
 */
CoverageConfigBuilder.prototype.build = function () {
  const userConfig = {
    istanbul: {
      excludes: this.properties.configuration.excludePatterns,
      nativeConfiguration: this.properties.configuration.nativeConfiguration,
      reportDirectory: this.properties.configuration.reportDirectory
    },
    enabled: this.properties.configuration.enabled
  };

  return userConfig;
};


exports.CoverageConfigBuilder = module.exports.CoverageConfigBuilder = CoverageConfigBuilder;
