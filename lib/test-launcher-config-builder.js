const _ = require('lodash'),
  CoverageConfigBuilder = require('./coverage-config-builder').CoverageConfigBuilder,
  TestConfigBuilder = require('./test-config-builder').TestConfigBuilder,
  ReportsConfigBuilder = require('./reports-config-builder').ReportsConfigBuilder,
  ProjectConfigBuilder = require('./project-config-builder').ProjectConfigBuilder;

/**
 * The configuration builder
 * In case you need to add a sub configuration builder, end you property name by ConfigBuilder, and it will
 * automatically added in the clear and build function.
 * To be handled by the build function, the builder need to have the property _subConfigurationGroupName defined
 * @constructor
 */
function TestLauncherConfigBuilder() {
  if (!(this instanceof TestLauncherConfigBuilder)) {
    return new (Function.prototype.bind.apply(TestLauncherConfigBuilder, Array.prototype.concat.apply([null], arguments)))();
  }

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    configuration: this._defaultConfiguration()
  });

  this._createSubConfigurationBuilder();
}

// Define the property container
Object.defineProperty(TestLauncherConfigBuilder.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});

/**
 * This function is called to create the configuration builder
 * Override this function to add you own builder. But do not forget to call the parent class
 */
TestLauncherConfigBuilder.prototype._createSubConfigurationBuilder = function () {
  this.properties = _.assign(this.properties, {
    coverageConfigBuilder: new CoverageConfigBuilder(this),
    testConfigBuilder: new TestConfigBuilder(this),
    reportsConfigBuilder: new ReportsConfigBuilder(this),
    projectConfigBuilder: new ProjectConfigBuilder(this)
  });
};

/**
 * Returns the default configuration
 * @return {Object} The default configuration
 */
TestLauncherConfigBuilder.prototype._defaultConfiguration = function () {
  return {
    steps: {
      preLaunch: [],
      preTestLaunch: [],
      postExecution: [],
      cleanUp: []
    }
  };
};

/**
 * Returns the test configuration builder
 * @return {TestConfigBuilder} The builder
 */
TestLauncherConfigBuilder.prototype.testConfiguration = function () {
  return this.properties.testConfigBuilder;
};

/**
 * Returns the reports configuration builder
 * @return {ReportsConfigBuilder} The builder
 */
TestLauncherConfigBuilder.prototype.reportsConfiguration = function () {
  return this.properties.reportsConfigBuilder;
};

/**
 * Returns the coverage configuration builder
 * @return {CoverageConfigBuilder} The builder
 */
TestLauncherConfigBuilder.prototype.coverageConfiguration = function () {
  return this.properties.coverageConfigBuilder;
};

/**
 * Returns the project configuration builder
 * @return {ProjectConfigBuilder} The builder
 */
TestLauncherConfigBuilder.prototype.projectConfiguration = function () {
  return this.properties.projectConfigBuilder;
};

/**
 * Construct the configuration
 * @return {Object} The configuration generated
 */
TestLauncherConfigBuilder.prototype.build = function () {
  const subConfiguration = {};

  // _subConfigurationGroupName
  _.each(_.filter(_.keysIn(this.properties), key => _.endsWith(key, 'ConfigBuilder')), key => {
    if (_.isObject(this.properties[key]) && _.isFunction(this.properties[key].build) && _.isString(this.properties[key]._subConfigurationGroupName)) {
      subConfiguration[this.properties[key]._subConfigurationGroupName] = this.properties[key].build();
    }
  });

  return _.assign({}, this.properties.configuration, subConfiguration);
};

/**
 * Reset the internal data
 * @return {TestLauncherConfigBuilder} itself
 */
TestLauncherConfigBuilder.prototype.clear = function () {
  this.properties.configuration = this._defaultConfiguration();
  // Use a special pattern
  _.each(_.filter(_.keysIn(this.properties), key => _.endsWith(key, 'ConfigBuilder')), key => {
    if (_.isObject(this.properties[key]) && _.isFunction(this.properties[key].clear)) {
      this.properties[key].clear();
    }
  });
  return this;
};

/**
 * Add a pre-launch step
 * @param {function} value The step to add
 * @return {TestLauncherConfigBuilder} itself
 */
TestLauncherConfigBuilder.prototype.withPreLaunchStep = function (value) {
  if (_.isFunction(value)) {
    this.properties.configuration.steps.preLaunch.push({
      handler: value
    });
  }

  return this;
};

/**
 * Add a pre test launch step
 * @param {function} value The step to add
 * @return {TestLauncherConfigBuilder} itself
 */
TestLauncherConfigBuilder.prototype.withPreTestLaunchStep = function (value) {
  if (_.isFunction(value)) {
    this.properties.configuration.steps.preTestLaunch.push({
      handler: value
    });
  }

  return this;
};

/**
 * Add a post execution step
 * @param {function} value The step to add
 * @return {TestLauncherConfigBuilder} itself
 */
TestLauncherConfigBuilder.prototype.withPostExecutionStep = function (value) {
  if (_.isFunction(value)) {
    this.properties.configuration.steps.postExecution.push({
      handler: value
    });
  }

  return this;
};

/**
 * Add a clean up step
 * @param {function} value The step to add
 * @return {TestLauncherConfigBuilder} itself
 */
TestLauncherConfigBuilder.prototype.withCleanUpStep = function (value) {
  if (_.isFunction(value)) {
    this.properties.configuration.steps.cleanUp.push({
      handler: value
    });
  }

  return this;
};


exports.TestLauncherConfigBuilder = module.exports.TestLauncherConfigBuilder = TestLauncherConfigBuilder;
