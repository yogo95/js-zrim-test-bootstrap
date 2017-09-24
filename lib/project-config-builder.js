const _ = require('lodash');

/**
 * The configuration builder for the project part
 * @constructor
 */
function ProjectConfigBuilder(parent) {
  if (!(this instanceof ProjectConfigBuilder)) {
    return new (Function.prototype.bind.apply(ProjectConfigBuilder, Array.prototype.concat.apply([null], arguments)))();
  }

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    parent: parent,
    configuration: this._defaultConfiguration()
  });
}

Object.defineProperty(ProjectConfigBuilder.prototype, "_subConfigurationGroupName", {
  value: 'project',
  enumerable: false,
  writable: true
});

// Define the property container
Object.defineProperty(ProjectConfigBuilder.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});

/**
 * Returns the default configuration
 * @return {Object} The default configuration
 * @private
 */
ProjectConfigBuilder.prototype._defaultConfiguration = function () {
  return _.cloneDeep({
    rootDirectoryPath: undefined
  });
};

/**
 * Reset the internal data
 * @return {ProjectConfigBuilder} itself
 */
ProjectConfigBuilder.prototype.clear = function () {
  this.properties.configuration = this._defaultConfiguration();
  return this;
};

/**
 * Set root directory path
 * @param {string|undefined} [value] The new type
 * @return {ProjectConfigBuilder} itself
 */
ProjectConfigBuilder.prototype.rootDirectoryPath = function (value) {
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
ProjectConfigBuilder.prototype.parentBuilder = function () {
  return this.properties.parent;
};

/**
 * Build the configuration
 * @return {Object} The configuration
 */
ProjectConfigBuilder.prototype.build = function () {
  const userConfig = {
    rootDirectoryPath: this.properties.configuration.rootDirectoryPath
  };

  return _.merge({}, userConfig);
};


exports.ProjectConfigBuilder = module.exports.ProjectConfigBuilder = ProjectConfigBuilder;
