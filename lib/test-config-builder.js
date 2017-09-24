const _ = require('lodash');

/**
 * The configuration builder for the test part
 * @constructor
 */
function TestConfigBuilder(parent) {
  if (!(this instanceof TestConfigBuilder)) {
    return new (Function.prototype.bind.apply(TestConfigBuilder, Array.prototype.concat.apply([null], arguments)))();
  }

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    parent: parent,
    configuration: this._defaultConfiguration()
  });
}

Object.defineProperty(TestConfigBuilder.prototype, "_subConfigurationGroupName", {
  value: 'test',
  enumerable: false,
  writable: true
});

// Define the property container
Object.defineProperty(TestConfigBuilder.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});

/**
 * Returns the default configuration
 * @return {Object} The default configuration
 * @private
 */
TestConfigBuilder.prototype._defaultConfiguration = function () {
  return _.cloneDeep({
    type: 'unknown',
    specDirPath: undefined,
    nativeConfiguration: {},
    specFileFilters: [],
    features: {
      enableJunitXml: true,
      enableHtml: true
    }
  });
};

/**
 * Reset the internal data
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.clear = function () {
  this.properties.configuration = this._defaultConfiguration();
  return this;
};

/**
 * Set the directory where to find the spec. This path is join to the project directory path
 * @param {string|undefined} [value] The new type
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.specDirPath = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.specDirPath = this._defaultConfiguration().specDirPath;
  } else if (_.isString(value)) {
    this.properties.configuration.specDirPath = value;
  }

  return this;
};

/**
 * Set the test type
 * @param {string|undefined} [value] The new type
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.type = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.type = this._defaultConfiguration().type;
  } else if (_.isString(value)) {
    this.properties.configuration.type = value;
  }

  return this;
};

/**
 * Set the test type as unit test
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.unitTest = function () {
  return this.type('unit');
};

/**
 * Set the test type as integration test
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.integrationTest = function () {
  return this.type('integration');
};

/**
 * Set the test type as system test
 * @return {TestConfigBuilder} itself
 */
TestConfigBuilder.prototype.systemTest = function () {
  return this.type('system');
};


/**
 * Set the native configuration to use. The native configuration is merged with the data
 * @param {Object|undefined} [value] The native configuration
 * @return {TestConfigBuilder} the parent builder
 */
TestConfigBuilder.prototype.nativeConfiguration = function (value) {
  if (_.isNil(value)) {
    this.properties.configuration.nativeConfiguration = this._defaultConfiguration().nativeConfiguration;
  } else if (_.isObject(value)) {
    this.properties.configuration.nativeConfiguration = value;
  }

  return this;
};

/**
 * Add a new filter for the spec files
 * @param {string|RegExp|Function} [value] The filter to add
 * @return {TestConfigBuilder} the parent builder
 */
TestConfigBuilder.prototype.withSpecFileFilter = function (value) {
  if (_.isFunction(value) || _.isRegExp(value) || _.isString(value)) {
    this.properties.configuration.specFileFilters.push(value);
  }

  return this;
};

/**
 * Returns the parent configuration
 * @return {TestLauncherConfigBuilder} the parent builder
 */
TestConfigBuilder.prototype.parentBuilder = function () {
  return this.properties.parent;
};

/**
 * Build the configuration
 * @return {Object} The configuration
 */
TestConfigBuilder.prototype.build = function () {
  const userConfig = {
    type: this.properties.configuration.type,
    specFileFilters: this.properties.configuration.specFileFilters,
    jasmine: {
      features: {
        enableJunitXml: this.properties.configuration.features.enableJunitXml,
        enableHtml: this.properties.configuration.features.enableHtml
      },
      nativeConfig: this.properties.configuration.nativeConfiguration
    }
  };

  return userConfig;
};


exports.TestConfigBuilder = module.exports.TestConfigBuilder = TestConfigBuilder;
