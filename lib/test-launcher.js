const _ = require('lodash'),
  util = require('util'),
  Joi = require('joi'),
  pathUtil = require('path'),
  async = require('async');


const LOGGER = {
  log: function () {
    const level = _.isString(arguments[0]) ? arguments[0].toLowerCase() : 'unknown',
      utilArgs = _.slice(arguments, 1);

    if (_.indexOf(['unknown', 'debug'], level) >= 0 && !process.env.TEST_LOG_VERBODE) {
      return;
    }

    const message = util.format.apply(util, utilArgs),
      stream = level === 'error' ? process.stderr : process.stdout;

    stream.write('[');
    stream.write(level.toUpperCase());
    stream.write('] ');
    stream.write(message);
  }
};
LOGGER.debug = LOGGER.log.bind(LOGGER, 'debug');
LOGGER.info = LOGGER.log.bind(LOGGER, 'info');
LOGGER.warn = LOGGER.log.bind(LOGGER, 'warn');
LOGGER.error = LOGGER.log.bind(LOGGER, 'error');

function lodashMergerWithIgnoreNil(objValue, srcValue) {
  if (_.isNil(srcValue)) {
    return objValue;
  }
}


/**
 * This is the context available from jasmine.getEnv().executionContext<br />
 * This help to pass any information in you test
 * @typedef {Object} TestLauncher.ExecutionContext
 */


/**
 *
 * You can have internal step defined in the class. The name auto detected start with <code>_autoStep</code> following
 * with the step type like <code>_autoStepPreLaunchToSomeStuff</code>
 * @constructor
 */
function TestLauncher() {
  if (!(this instanceof TestLauncher)) {
    return new (Function.prototype.bind.apply(TestLauncher, Array.prototype.concat.apply([null], arguments)))();
  }

  this.logger = LOGGER;

  // Configure properties object
  this.properties = _.assign(_.merge({}, this.properties), {
    currentState: TestLauncher.States.None,
    executionContext: {},
    processExitCode: 0,
    // Private data for istanbul
    istanbul: {
      // The istanbul configuration object
      config: undefined,
      coverageVariableName: '$$cov_' + new Date().getTime() + '$$'
    },
    // Private data for jasmine
    jasmine: {
      // Contains the jasmine instance
      instance: undefined,
      lastExecution: {
        success: false
      }
    },

    // Contains all the steps
    steps: {
      preLaunch: [],
      preTestLaunch: [],
      postExecution: [],
      cleanUp: []
    },

    // Contains the configuration before analyzing
    rawInputConfiguration: {
      configurationFunc: undefined,
      fromEnvVariables: undefined
    },

    configuration: {
      developerModeEnabled: !!process.env.ENABLE_DEVELOPER_MODE,
      project: {
        rootDirectoryPath: undefined
      },
      reports: {
        rootDirectoryPath: undefined
      },
      test: {
        type: 'unknown',
        specDirPath: undefined,
        // Help to filter spec files
        specFileFilters: [],
        jasmine: {
          features: {
            reports: {
              enableJunitXml: true,
              enableHtml: true
            }
          },
          lastExecution: {
            success: false
          }
        }
      },
      coverage: {
        enabled: !process.env.DISABLE_CODE_COVERAGE,
        istanbul: {
          excludes: ['**/test/**', '**/node_modules/**'],
          nativeConfiguration: undefined,
          reportDirectory: 'coverage'
        }
      }
    }
  });
}

/**
 * Contains the states possible
 */
TestLauncher.States = {
  None: 'none',
  Running: 'running',
  Ready: 'ready',
  PostExecution: 'postExecution',
  ShuttingDown: 'shuttingDown'
};

// Define the property container
Object.defineProperty(TestLauncher.prototype, "properties", {
  value: {},
  enumerable: false,
  writable: true
});

Object.defineProperty(TestLauncher.prototype, "currentState", {
  get: function () {
    return this.properties.currentState;
  },
  set: function (newState) {
    this.properties.currentState = newState;
  },
  enumerable: true
});

/**
 * Returns the configuration
 * @return {Object} The configuration
 */
TestLauncher.prototype.getConfiguration = function () {
  return this.properties.configuration;
};


/**
 * Returns root directory path of you project
 * @return {string} The directory path
 */
TestLauncher.prototype.getProjectRootDirPath = function () {
  return this.properties.configuration.project.rootDirectoryPath;
};

/**
 * Returns the type of test to run (unit, integration, system, etc.)
 * @return {string} The type of test
 */
TestLauncher.prototype.getTestType = function () {
  return this.properties.configuration.test.type;
};

/**
 * Returns the report root path directory
 * @return {string} The path
 */
TestLauncher.prototype.getRootReportPath = function () {
  return this.properties.configuration.reports.rootDirectoryPath || (this.getProjectRootDirPath() + '/reports/test');
};

/**
 * Returns the report root path directory for the test
 * @see TestLauncher.getRootReportPath
 * @see TestLauncher.getTestType
 * @return {string} The path
 */
TestLauncher.prototype.getRootReportTestPath = function () {
  return this.getRootReportPath() + "/" + this.getTestType();
};

/**
 * Returns the root path directory that contains the test to execute
 * @see TestLauncher.getTestType
 * @see TestLauncher.isDeveloperModeEnabled
 * @return {string} The path
 */
TestLauncher.prototype.getTestSpecDirPath = function () {
  if (this.properties.configuration.test.specDirPath) {
    // User specify the directory to use
    return this.properties.configuration.test.specDirPath;
  } else if (this.isDeveloperModeEnabled()) {
    return './';
  } else {
    // Generate using the standard
    return util.format('test/%s', this.getTestType());
  }
};

/**
 * Help to know if we'd like to use the code coverage
 * @return {boolean} true if enabled, otherwise false
 */
TestLauncher.prototype.isCodeCoverageEnabled = function () {
  return this.properties.configuration.coverage.enabled;
};

/**
 * Help to know if the developer mode is enable.
 * This is when you run the process from the file itself
 * @return {boolean} true if enabled, otherwise false
 */
TestLauncher.prototype.isDeveloperModeEnabled = function () {
  return this.properties.configuration.developerModeEnabled;
};

/**
 * Returns the input configuration
 * @return {undefined|Object} The input configuration
 */
TestLauncher.prototype.getInputConfiguration = function () {
  return this.properties.inputConfiguration;
};

/**
 * Check if the state is ready
 * @return {boolean} true if ready, otherwise false
 */
TestLauncher.prototype.isReady = function () {
  return this.currentState === TestLauncher.States.Ready;
};

/**
 * Check if the state is running
 * @return {boolean} true if running, otherwise false
 */
TestLauncher.prototype.isRunning = function () {
  return this.currentState === TestLauncher.States.Running;
};


/**
 * The response that contains the jasmine configuration
 * @typedef {Object} TestLauncher.fetchJasmineConfiguration~OnResolve
 * @property {Object} configuration The configuration fetched
 */
/**
 * Fetch the jasmine configuration
 * @return {Promise} {@link TestLauncher.fetchJasmineConfiguration~OnResolve} On resolve
 */
TestLauncher.prototype.fetchJasmineConfiguration = function () {
  return new Promise(resolve => {
    const defaultJasmineConfiguration = {
      spec_dir: this.getTestSpecDirPath(),
      spec_files: [
        "**/*[sS]pec.js",
        '*[sS]pec.js'
      ],
      stopSpecOnExpectationFailure: false,
      random: false
    };

    const jasmineConfiguration = _.mergeWith({},
      defaultJasmineConfiguration,
      this.properties.configuration.test.jasmine,
      lodashMergerWithIgnoreNil
    );

    resolve({
      configuration: jasmineConfiguration
    });
  });
};

/**
 * The response that contains the istanbul configuration
 * @typedef {Object} TestLauncher.fetchIstanbulConfiguration~Response
 * @property {Object} configuration The configuration fetched
 */
/**
 * Fetch the istanbul configuration
 * @return {Promise} The promise object. In case of success {@link TestLauncher.fetchIstanbulConfiguration~Response}
 */
TestLauncher.prototype.fetchIstanbulConfiguration = function () {
  return new Promise(resolve => {
    const inputConfiguration = this.properties.configuration.coverage.istanbul;

    const reportsDirectory = util.format('%s/%s',
      this.getRootReportTestPath(),
      inputConfiguration.reportDirectory);

    const defaultConfiguration = {
      instrumentation: {
        root: this.getProjectRootDirPath(),
        excludes: inputConfiguration.excludes
      },
      reporting: {
        print: "summary",
        dir: reportsDirectory
      },
      reports: ['lcov'],
      dir: reportsDirectory
    };

    const istanbulConfiguration = _.mergeWith({},
      defaultConfiguration,
      inputConfiguration.nativeConfiguration,
      lodashMergerWithIgnoreNil
    );

    resolve({
      configuration: istanbulConfiguration
    });
  });
};

/**
 * Start the test using the coverage
 * @return {Promise} The promise object. The success is called when the test started
 */
TestLauncher.prototype._startCoverage = function () {
  const __pretty_name__ = '_startCoverage';

  return new Promise((resolve, reject) => {
    const istanbul = require('istanbul');

    global[this.properties.istanbul.coverageVariableName] = {};

    this.fetchIstanbulConfiguration()
      .then(response => {
        return new Promise((resolve, reject) => {
          const configuration = istanbul.config.loadObject(response.configuration);
          this.properties.istanbul.config = configuration;


          const excludes = configuration.instrumentation.excludes(true);
          istanbul.matcherFor({
            root: configuration.instrumentation.root() || process.cwd(),
            includes: configuration.instrumentation.extensions().map(ext => '**/*' + ext),
            excludes: excludes
          }, (error, matchFn) => {
            if (error) {
              // The fatal kill the process
              this.logger.error("[%s] Failed to create istanbul matcher: %s\n%s", __pretty_name__, error.message, error.stack);
              return reject(error);
            }

            const instrumenter = new istanbul.Instrumenter({
                coverageVariable: this.properties.istanbul.coverageVariableName,
                preserveComments: true
              }),
              transformer = instrumenter.instrumentSync.bind(instrumenter);

            // Enable the require hook
            istanbul.hook.hookRequire(matchFn, transformer);
            resolve();
          });
        }); // new Promise
      })
      .then(() => resolve())
      .catch(error => {
        this.logger.error("[%s] Failure: %s\n%s", __pretty_name__, error.message, error.stack);
        reject(error);
      });
  });
};

/**
 * Start the execution for the test
 * @return {Promise} The promise object
 */
TestLauncher.prototype._startTest = function () {
  return new Promise(resolve => {
    this.properties.jasmine.instance.onComplete(passed => {
      this.properties.jasmine.lastExecution.success = !!passed;
      setImmediate(() => this._handleTestFinished());
    });

    this.logger.info("Start the execution");
    this.properties.jasmine.instance.execute();
    resolve();
  });
};

/**
 * Handle the end execution of jasmine.<br />
 * Called after jasmine finished
 */
TestLauncher.prototype._handleTestFinished = function () {
  const __pretty_name__ = '_handleTestFinished';

  // Do the post execution
  this.currentState = TestLauncher.States.PostExecution;

  // Execute the steps post execution
  const postExecutionContext = this._createStepBaseContext();
  postExecutionContext.testSucceed = this.properties.jasmine.lastExecution.success;
  // Set the exit code
  this.logger.debug('[%s] Jasmine return success=%s', __pretty_name__, this.properties.jasmine.lastExecution.success);
  this.properties.processExitCode = this.properties.jasmine.lastExecution.success ? 0 : 1;

  this._execSteps({
    groupName: 'postExecution',
    context: postExecutionContext,
    stopOnError: false,
    setExitCode: code => {
      if (_.isNumber(code)) {
        this.properties.processExitCode = code;
      }
    }
  })
    .then(() => {
      const cleanUpContext = this._createStepBaseContext();
      return this._execSteps({
        groupName: 'cleanUp',
        context: cleanUpContext,
        stopOnError: false
      });
    })
    .catch(error => {
      this.logger.error("[%s] Something goes wrong: %s\n%s", __pretty_name__, error.message, error.stack);
      this.properties.processExitCode = 1;
    })
    .then(() => this.currentState = TestLauncher.States.ShuttingDown)
    .then(() => this._doShutDown(), () => this._doShutDown());
};

/**
 * Do the shut down part.
 */
TestLauncher.prototype._doShutDown = function () {
  process.exit(this.properties.processExitCode);
};


/**
 * Contains the configuration for the test
 * @typedef {Object} TestLauncher.configure~TestWithJasmineFeatures
 * @property {boolean} enableJunitXml true to enable the report as junit xml
 * @property {boolean} enableHtml true to enable the report as HTML
 */
/**
 * Contains the configuration for the test
 * @typedef {Object} TestLauncher.configure~TestWithJasmine
 * @property {TestLauncher.configure~TestWithJasmineFeatures} features The jasmine feature
 * @property {Object} nativeConfig The native configuration, will override the one generated
 */
/**
 * @function TestLauncher.configure~TestSpecFileFilter
 * @param {string} specFilePath The spec file path
 * @return {Promise} {@link TestLauncher.configure~TestSpecFileFilterOnResolve} on resolve
 */
/**
 * @typedef {Object} TestLauncher.configure~TestSpecFileFilterOnResolve
 * @property {boolean|undefined|null} ignore true if the file must be ignored, false to keep the file, other value mean do not use this filter
 */
/**
 * Contains the configuration for the test
 * @typedef {Object} TestLauncher.configure~Test
 * @property {string|undefined|null} type The test type
 * @property {string|undefined} rootDirectoryPath The root directory path to use for the test
 * @property {string|TestLauncher.configure~TestSpecFileFilter|RegExp} specFileFilters Define some filter to apply to each file. When using regexp, if match, the file is ignored
 * @property {TestLauncher.configure~TestWithJasmine} jasmine The jasmine configuration part
 */
/**
 * Contains the configuration for the coverage (with istanbul)
 * @typedef {Object} TestLauncher.configure~CoverageWithIstanbul
 * @property {string[]} excludes The list of excludes
 * @property {Object|undefined} [nativeConfiguration] The native configuration to merge
 * @property {string|undefined} [reportDirectory] The directory name to use for the coverage
 */
/**
 * Contains the configuration for the coverage
 * @typedef {Object} TestLauncher.configure~Coverage
 * @property {boolean|undefined} [enabled] Enable or not the coverage
 * @property {TestLauncher.configure~CoverageWithIstanbul} istanbul The istanbul configuration part
 */

/**
 * Contains the reports configuration
 * @typedef {Object} TestLauncher.configure~Reports
 * @property {string} rootDirectoryPath The directory path for all reports. If not project auto generated
 */

/**
 * Contains the project configuration
 * @typedef {Object} TestLauncher.configure~Project
 * @property {string} rootDirectoryPath The root directory path of your project
 */


/**
 * Contains a step configuration
 * @typedef {Object} TestLauncher.configure~Step
 * @property {Function} handler The function to be executed (see {@link })
 */
/**
 * Contains the steps
 * @typedef {Object} TestLauncher.configure~Steps
 * @property {TestLauncher.configure~Step[]} preLaunch The pre launch steps (before anything)
 * @property {TestLauncher.configure~Step[]} preLaunchTest The step executed just before the test but after the the coverage
 * @property {TestLauncher.configure~Step[]} postExecution The step just after the execution finished
 * @property {TestLauncher.configure~Step[]} cleanUp The clean up steps. (Always executed)
 */
/**
 * Object to configure the launcher
 * @typedef {Object} TestLauncher.configure~Options
 * @property {string} rootDirectory The project root directory. This is important for the coverage
 * @property {TestLauncher.configure~Reports} reports The reports configuration
 * @property {TestLauncher.configure~Coverage} coverage The coverage configuration
 * @property {TestLauncher.configure~Test} test The test configuration
 * @property {TestLauncher.configure~Project} project The project configuration
 * @property {TestLauncher.configure~Steps} steps The steps configuration
 */


const configureEnvOptionsSchema = Joi.object().keys({
  project: Joi.object().keys({
    rootDirectoryPath: Joi.string()
  }).unknown(),
  reports: Joi.object().keys({
    rootDirectoryPath: Joi.string()
  }).unknown(),
  coverage: Joi.object().keys({
    enabled: Joi.boolean(),
    istanbul: Joi.object().keys({
      excludes: Joi.array().items(Joi.string()),
      nativeConfiguration: Joi.object().unknown(),
      reportDirectory: Joi.string()
    }).unknown()
  }).unknown(),
  test: Joi.object().keys({
    type: Joi.string(),
    specDirPath: Joi.string().allow(null),
    jasmine: Joi.object().keys({
      features: Joi.object().keys({
        enableJunitXml: Joi.boolean(),
        enableHtml: Joi.boolean()
      }).unknown(),
      nativeConfig: Joi.object().unknown()
    }).unknown()
  }).unknown()
}).unknown().required();

/**
 * @typedef {Object} TestLauncher._getConfigurationFromEnvVars~OnResolve
 * @property {Object} configuration The configuration generated
 * @property {Object} rawConfiguration The configuration as input
 */
/**
 * Get the configuration from the environment variable
 * The function is in charge of validating the input.
 * The function can return null for a property so it won't be use
 * @return {Promise} {@link TestLauncher._getConfigurationFromEnvVars~OnResolve} on success
 */
TestLauncher.prototype._getConfigurationFromEnvVars = function () {
  return new Promise((resolve, reject) => {
    const inputConfiguration = {
      project: {
        rootDirectoryPath: _.get(process.env, 'CONFIG_PROJECT_ROOT_DIR_PATH', undefined)
      },
      reports: {
        rootDirectoryPath: _.get(process.env, 'CONFIG_REPORTS_ROOT_DIR_PATH', undefined)
      },
      coverage: {
        enabled: _.get(process.env, 'CONFIG_COVERAGE_ENABLED', undefined),
        istanbul: {
          excludes: _.filter(_.map(_.split(_.get(process.env, 'CONFIG_COVERAGE_EXCLUDES', ''), ','), item => item.trim()), item => item.length > 0),
          reportDirectory: _.get(process.env, 'CONFIG_COVERAGE_REPORT_DIR_NAME', undefined)
        }
      },
      test: {
        type: _.get(process.env, 'CONFIG_TEST_TYPE', undefined),
        specDirPath: _.get(process.env, 'CONFIG_TEST_SPEC_DIR_PATH', undefined),
        jasmine: {
          features: {
            enableJunitXml: _.get(process.env, 'CONFIG_TEST_ENABLE_REPORT_JUNIT', undefined),
            enableHtml: _.get(process.env, 'CONFIG_TEST_ENABLE_REPORT_HTML', undefined)
          }
        }
      }
    };

    Joi.validate(inputConfiguration, configureEnvOptionsSchema, (error, validatedConfiguration) => {
      if (error) {
        return reject(error);
      }

      // Create the new object with the value parsed
      const configuration = {
        project: {
          rootDirectoryPath: _.get(validatedConfiguration, 'project.rootDirectoryPath', undefined)
        },
        reports: {
          rootDirectoryPath: _.get(validatedConfiguration, 'reports.rootDirectoryPath', undefined)
        },
        coverage: {
          enabled: _.get(validatedConfiguration, 'coverage.enabled', undefined),
          istanbul: {
            excludes: _.get(validatedConfiguration, 'coverage.istanbul.excludes', undefined),
            reportDirectory: _.get(validatedConfiguration, 'coverage.istanbul.reportDirectory', undefined)
          }
        },
        test: {
          type: _.get(validatedConfiguration, 'test.type', undefined),
          specDirPath: _.get(validatedConfiguration, 'test.specDirPath', undefined),
          jasmine: {
            features: {
              reports: {
                enableJunitXml: _.get(validatedConfiguration, 'test.jasmine.features.enableJunitXml', undefined),
                enableHtml: _.get(validatedConfiguration, 'test.jasmine.features.enableHtml', undefined)
              }
            }
          }
        }
      };

      return resolve({
        configuration: configuration,
        rawConfiguration: inputConfiguration
      });
    });
  });
};

const configurationStepSchema = () => Joi.object().keys({
  handler: Joi.func().required()
}).unknown();

const configureOptionsSchema = Joi.object().keys({
  project: Joi.object().keys({
    rootDirectoryPath: Joi.string().required()
  }).unknown().required(),
  reports: Joi.object().keys({
    rootDirectoryPath: Joi.string()
  }).unknown(),
  coverage: Joi.object().keys({
    enabled: Joi.boolean(),
    istanbul: Joi.object().keys({
      excludes: Joi.array().items(Joi.string()),
      nativeConfiguration: Joi.object().unknown(),
      reportDirectory: Joi.string()
    }).unknown()
  }).unknown().required(),
  test: Joi.object().keys({
    type: Joi.string().required(),
    specDirPath: Joi.string().allow(null),
    specFileFilters: Joi.array().items(
      Joi.string(),
      Joi.func(),
      Joi.object().type(RegExp)
    ),
    jasmine: Joi.object().keys({
      features: Joi.object().keys({
        enableJunitXml: Joi.boolean(),
        enableHtml: Joi.boolean()
      }).unknown(),
      nativeConfig: Joi.object().unknown()
    }).unknown()
  }).unknown().required(),
  steps: Joi.object().keys({
    preLaunch: Joi.array().items(configurationStepSchema()),
    preTestLaunch: Joi.array().items(configurationStepSchema()),
    postExecution: Joi.array().items(configurationStepSchema()),
    cleanUp: Joi.array().items(configurationStepSchema())
  }).unknown()
}).unknown().required();

/**
 * @typedef {Object} TestLauncher._getUserConfigurationFromObject~OnResolve
 * @property {Object} configuration The configuration generated
 * @property {Object} rawConfiguration The raw configuration
 */
/**
 * Handle the configuration given by the user.
 * This function is in charge of validating the input
 * @param {TestLauncher.configure~Options} userOptions The options
 * @return {Promise} {@link TestLauncher._getUserConfigurationFromObject~OnResolve} on success
 */
TestLauncher.prototype._getUserConfigurationFromObject = function (userOptions) {
  return new Promise((resolve, reject) => {
    Joi.validate(userOptions, configureOptionsSchema, (error, validatedOptions) => {
      if (error) {
        return reject(error);
      }

      const configuration = {
        // From the input
        project: {
          rootDirectoryPath: _.get(validatedOptions, 'project.rootDirectoryPath')
        },
        reports: {
          rootDirectoryPath: _.get(validatedOptions, 'reports.rootDirectoryPath')
        },
        test: {
          type: _.get(validatedOptions, 'test.type'),
          specDirPath: _.get(validatedOptions, 'test.specDirPath'),
          specFileFilters: _.get(userOptions, 'test.specFileFilters'),
          jasmine: {
            features: {
              reports: {
                enableJunitXml: _.get(validatedOptions, 'test.jasmine.features.enableJunitXml'),
                enableHtml: _.get(validatedOptions, 'test.jasmine.features.enableHtml')
              }
            }
          }
        },
        coverage: {
          istanbul: {
            excludes: _.get(validatedOptions, 'coverage.istanbul.excludes'),
            nativeConfiguration: _.get(userOptions, 'coverage.istanbul.nativeConfiguration'),
            reportDirectory: _.get(validatedOptions, 'coverage.istanbul.reportDirectory')
          }
        },
        steps: _.assign({}, userOptions.steps)
      };

      resolve({
        rawConfiguration: userOptions,
        configuration: configuration
      });
    });
  });
};


/**
 * Configure the launcher
 * @param {TestLauncher.configure~Options} options The options
 * @return {Promise} The promise object
 */
TestLauncher.prototype.configure = function (options) {
  // const __pretty_name__ = "configure";

  return new Promise((resolve, reject) => {
    const configs = {
      fromEnv: undefined,
      fromUsr: undefined
    };

    this._getUserConfigurationFromObject(options)
      .then(response => {
        configs.fromUsr = response;
        return this._getConfigurationFromEnvVars();
      })
      .then(response => {
        configs.fromEnv = response;
      })
      .then(() => {
        // Merge the configuration
        this.properties.rawInputConfiguration.configurationFunc = configs.fromUsr.rawConfiguration;
        this.properties.rawInputConfiguration.fromEnvVariables = configs.fromEnv.rawConfiguration;

        const configuration = _.mergeWith({}, this.properties.configuration, configs.fromUsr.configuration, configs.fromEnv.configuration, lodashMergerWithIgnoreNil);
        // For path to be absolute
        configuration.project.rootDirectoryPath = pathUtil.resolve(configuration.project.rootDirectoryPath);
        if (configuration.reports.rootDirectoryPath) {
          configuration.reports.rootDirectoryPath = pathUtil.resolve(configuration.reports.rootDirectoryPath);
        }

        this.properties.configuration = configuration;

        // Those are the one use
        this.properties.steps.preLaunch = _.concat([], this.properties.steps.preLaunch, configs.fromUsr.rawConfiguration.steps.preLaunch);
        this.properties.steps.preTestLaunch = _.concat([], this.properties.steps.preTestLaunch, configs.fromUsr.rawConfiguration.steps.preTestLaunch);
        this.properties.steps.postExecution = _.concat([], this.properties.steps.postExecution, configs.fromUsr.rawConfiguration.steps.postExecution);
        this.properties.steps.cleanUp = _.concat([], this.properties.steps.cleanUp, configs.fromUsr.rawConfiguration.steps.cleanUp);

        this.currentState = TestLauncher.States.Ready;
        resolve();
      })
      .catch(reject);
  });
};


/**
 * @typedef {Object} TestLauncher._execSteps~Options
 * @property {string} groupName The steps to use
 * @property {Object} context The context to use
 * @property {boolean} stopOnError Stop the workflow if an error append
 */
/**
 * Execute a group of steps
 * @param {TestLauncher._execSteps~Options} options The options
 * @return {Promise} The promise object
 */
TestLauncher.prototype._execSteps = function (options) {
  return new Promise((resolve, reject) => {
    if (!_.isArray(this.properties.steps[options.groupName])) {
      return reject(new Error(util.format("Cannot find the steps for '%s'", options.groupName)));
    }

    // Create a new step list which contains internal steps and external
    const internalSteps = [];
    const prefixName = '_autoStep' + options.groupName.substr(0, 1).toUpperCase() + options.groupName.substr(1);
    const functionNames = _.sortBy(_.filter(_.keysIn(this), test => {
      return _.startsWith(test, prefixName);
    }));

    _.each(functionNames, functionName => {
      if (_.isFunction(this[functionName])) {
        internalSteps.push({
          handler: this[functionName].bind(this)
        });
      }
    });

    const steps = _.concat([], internalSteps, this.properties.steps[options.groupName]);

    if (steps.length === 0) {
      return resolve();
    }

    let ignoreNextStep = false;
    const errors = [];

    const handleStepExecution = (step, index, callback) => {
      if (ignoreNextStep) {
        return setImmediate(callback);
      }

      step.handler(options.context)
        .then(result => {
          if (_.isObjectLike(result)) {
            ignoreNextStep = result.stopWorkflow === true;
          }
          setImmediate(callback);
        })
        .catch(error => {
          if (!options.stopOnError) {
            errors.push(error);
            setImmediate(callback);
          } else {
            setImmediate(callback, error);
          }
        });
    };

    async.eachOfSeries(steps, handleStepExecution, error => {
      if (error) {
        setImmediate(reject, error);
      } else if (errors.length > 0) {
        setImmediate(reject, errors[0]);
      } else {
        setImmediate(resolve);
      }
    });
  });
};

/**
 * Create a base context for the steps
 * @return {Object} The base context
 */
TestLauncher.prototype._createStepBaseContext = function () {
  return {
    launcher: this,
    logger: this.logger,
    executionContext: this.properties.executionContext
  };
};

/**
 * The response that contains the jasmine reporters
 * @typedef {Object} TestLauncher.createJasmineReporters~OnResolve
 * @property {Object[]} reporters The reporters
 */
/**
 * Create jasmine reporters
 * @return {Promise} The promise object. In case of success {@link TestLauncher.createJasmineReporters~OnResolve}
 */
TestLauncher.prototype.createJasmineReporters = function () {
  return new Promise(resolve => {
    const reporters = [];

    if (this.properties.configuration.test.jasmine.features.reports.enableJunitXml) {
      const jasmineReporters = require('jasmine-reporters'),
        reporter = new jasmineReporters.JUnitXmlReporter({
          savePath: this.getRootReportTestPath() + "/juint/xml",
          consolidateAll: false
        });

      reporters.push(reporter);
    }

    if (this.properties.configuration.test.jasmine.features.reports.enableHtml) {
      const Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter'),
        reporter = new Jasmine2HtmlReporter({
          savePath: this.getRootReportTestPath() + "/html",
          screenshotsFolder: 'images',
          takeScreenshots: false
        });

      reporters.push(reporter);
    }

    resolve({
      reporters: reporters
    });
  });
};

/**
 * @typedef {Object} TestLauncher._filterTestSpecFiles~OnResolve
 * @property {string[]} filePathsFiltered The final list of file paths
 */
/**
 * @typedef {Object} TestLauncher._filterTestSpecFiles~Options
 * @property {string[]} filePaths The file paths found by jasmine
 */
const _filterTestSpecFilesOptionsSchema = Joi.object().keys({
  filePaths: Joi.array().items(Joi.string()).required()
}).unknown().required();
/**
 * Filter the spec files found by jasmine.
 * This is useful because we can use regex
 * @param {TestLauncher._filterTestSpecFiles~Options} options The options
 * @return {Promise} {@link TestLauncher._filterTestSpecFiles~OnResolve} on resolve
 */
TestLauncher.prototype._filterTestSpecFiles = function (options) {
  const __pretty_name__ = '_filterTestSpecFiles';

  return new Promise((resolve, reject) => {
    Joi.validate(options, _filterTestSpecFilesOptionsSchema, (error, validatedOptions) => {
      if (error) {
        return reject(error);
      }

      if (this.properties.configuration.test.specFileFilters.length === 0) {
        return resolve({
          filePathsFiltered: options.filePaths
        });
      }

      // Generate the filters
      const filters = [];
      try {
        _.each(this.properties.configuration.test.specFileFilters, filter => {
          if (_.isString(filter) || _.isRegExp(filter)) {
            let regexpFilter = filter;
            if (_.isString(filter)) {
              // Create a regexp
              regexpFilter = new RegExp(filter);
            }

            filters.push(function (filePath) {
              return new Promise(resolve => {
                const matches = filePath.match(regexpFilter);
                const ignoreFile = _.isArray(matches) && matches.length > 0;
                return resolve({
                  ignore: ignoreFile
                });
              });
            });
          } else {
            filters.push(filter);
          }
        });
      } catch (error) {
        return reject(error);
      }

      const filePathsFiltered = [];

      const handleFilePath = (filePath, index, callback) => {
        // Call all filters
        let keepFile = true;

        const handleFilter = (filter, index, callback) => {
          filter(filePath)
            .then(result => {
              if (result && result.ignore === true) {
                keepFile = false;
              }
              setImmediate(callback);
            })
            .catch(error => {
              this.logger.error(util.format("[%s] Filter %d failed: %s\n%s", __pretty_name__, index, error.message, error.stack));
              setImmediate(callback, error);
            });
        };

        async.eachOfLimit(filters, 20, handleFilter, error => {
          if (error) {
            return callback(error);
          }

          if (keepFile) {
            filePathsFiltered.push(filePath);
          }
          setImmediate(callback);
        });
      };

      // We do an async
      async.eachOfLimit(validatedOptions.filePaths, 20, handleFilePath, error => {
        if (error) {
          return setImmediate(reject, error);
        } else {
          setImmediate(resolve, {
            filePathsFiltered: filePathsFiltered
          });
        }
      });
    });
  });
};

/**
 * Instantiate jasmine and initialize it
 * @return {Promise} The promise object
 */
TestLauncher.prototype._instantiateAndInitJasmine = function () {
  const __pretty_name__ = '_instantiateAndInitJasmine';

  return new Promise((resolve, reject) => {
    const Jasmine = require('jasmine');
    const jasmineOptions = {
      projectBaseDir: this.getProjectRootDirPath()
    };

    const jasmineInstance = new Jasmine(jasmineOptions);

    this.fetchJasmineConfiguration()
      .then(response => {
        jasmineInstance.loadConfig(response.configuration);
        return this.createJasmineReporters();
      })
      .then(response => {
        _.each(response.reporters, reporter => jasmineInstance.addReporter(reporter));
        jasmineInstance.env.executionContext = this.properties.executionContext;

        return this._filterTestSpecFiles({
          filePaths: jasmineInstance.specFiles
        });
      })
      .then(specFilesResponse => {
        jasmineInstance.specFiles = specFilesResponse.filePathsFiltered || [];
        this.logger.debug("[%s] Use those files:\n%s\n", __pretty_name__, _.join(specFilesResponse.filePathsFiltered, "\n"));
        this.properties.jasmine.instance = jasmineInstance;
        resolve();
      })
      .catch(error => {
        this.logger.error("Failed to instantiate or initialize jasmine: %s\n%s", error.message, error.stack);
        reject(error);
      });
  });
};

/**
 * Save the coverage
 * @param {TestLauncher~PostExecutionStepContext} context The context to use
 * @return {Promise}
 */
TestLauncher.prototype._autoStepPostExecutionSaveCoverage = function (context) {
  return new Promise((resolve, reject) => {
    if (!this.isCodeCoverageEnabled()) {
      return resolve();
    }

    const istanbul = require('istanbul'),
      path = require('path'),
      fse = require('fs-extra'),
      config = context.launcher.properties.istanbul.config,
      cov = global[context.launcher.properties.istanbul.coverageVariableName],
      reportingDirectory = path.resolve(config.reporting.dir()),
      coverageResultFilePath = path.resolve(reportingDirectory, 'coverage.json'),
      reporter = new istanbul.Reporter(config);

    // Configure the reporter
    reporter.dir = reportingDirectory;
    reporter.addAll(config.reporting.reports());
    // Could also add manual reporters:
    // reporter.add('text');
    // reporter.add('text');
    // reporter.add('text-summary');
    // reporter.add('text-summary');

    // Create the directory path
    fse.ensureDir(reportingDirectory)
      .then(() => {
        return new Promise(resolve => {
          const collector = new istanbul.Collector();
          collector.add(cov);

          reporter.write(collector, true, function (error) {
            if (error) {
              setImmediate(reject, error);
            } else {
              setImmediate(resolve);
            }
          });
        });
      })
      .then(() => {
        // Write the coverage.json
        return fse.writeJson(coverageResultFilePath, cov);
      })
      .then(() => resolve())
      .catch(error => {
        context.logger.error("Fail to save coverage reports: %s\n%s", error.message, error.stack);
        reject(error);
      });
  });
};

/**
 * Start the execution of test
 * @return {Promise} The promise object
 */
TestLauncher.prototype.start = function () {
  const __pretty_name__ = "start";

  return new Promise((resolve, reject) => {
    if (this.isRunning()) {
      this.logger.info("Already running");
      return resolve();
    } else if (!this.isReady()) {
      this.logger.error("Launcher not ready");
      return reject(new Error(util.format("Launcher not ready")));
    }

    /*
      1 - We do a jasmine init
      2 - We do a prelaunch step
      3 - We start coverage if necessary
      4 - We do the pre test launch
      4 - We launch jasmine
     */

    this._instantiateAndInitJasmine()
      .then(() => {
        const preLaunchContext = this._createStepBaseContext();

        return this._execSteps({
          groupName: 'preLaunch',
          context: preLaunchContext
        });
      })
      .then(() => {
        if (this.isCodeCoverageEnabled()) {
          return this._startCoverage();
        } else {
          return new Promise(resolve => setImmediate(resolve));
        }
      })
      .then(() => {
        const preTestLaunchContext = this._createStepBaseContext();

        return this._execSteps({
          groupName: 'preTestLaunch',
          context: preTestLaunchContext
        });
      })
      .then(() => this._startTest())
      .then(() => {
        this.currentState = TestLauncher.States.Running;
        resolve();
      })
      .catch(error => {
        this.logger.error("[%s][Failed] %s\n%s", __pretty_name__, error.message, error.stack);
        const cleanUpContext = this._createStepBaseContext();
        return this._execSteps({
          groupName: 'cleanUp',
          context: cleanUpContext,
          stopOnError: false
        })
          .then(() => reject(error))
          .catch(() => reject(error));
      });
  });
};

/**
 * Same as {@link TestLauncher.start} but in case of failure the process stop
 */
TestLauncher.prototype.run = function () {
  const __pretty_name__ = "run";

  return new Promise(() => {
    this.start()
      .then(() => {})
      .catch(error => {
        this.logger.error("[%s] Failed to start : %s\n%s", __pretty_name__, error.message, error.stack);
        this.properties.processExitCode = 1;
        return this._doShutDown();
      });
  });
};


exports.TestLauncher = module.exports.TestLauncher = TestLauncher;
