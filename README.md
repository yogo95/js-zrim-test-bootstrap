# JavaScript Zrim Test Bootstrap

## Introduction

The goal of this project is to provide utilities to make test easier.

## Test Launcher

The **TestLauncher** class use those environment variable to have the default
behaviour:
- DISABLE_CODE_COVERAGE : Disable the code coverage (set the variable to 1)

Example:

```javascript
const TestLauncher = require('js-zrim-test-bootstrap').TestLauncher;
```

The test launcher is able to enable the coverage for your unit, integration and system test.
This features is not available if you start the application in a different process or use cluster process.

## Configuration

By default the test launcher will use the configuration given to the **configure** function.
Some configuration can be override by some environment variables.

### Builders

The module export a builder which help you generate the configuration.
The test launcher can be configured without the builder.

## Examples

### Unit Test

In this example, we use the configuration builder to help us create the configuration
with a nicer look.

And in case of success we start the test. The coverage and test result will automatically be saved.

```javascript
const TestLauncher = require('js-zrim-test-bootstrap').TestLauncher,
  TestLauncherConfigBuilder = require('js-zrim-test-bootstrap').TestLauncherConfigBuilder,
  util = require('util');

const testLauncher = new TestLauncher(),
  configBuilder = new TestLauncherConfigBuilder();

configBuilder
  .projectConfiguration()
  .rootDirectoryPath(__dirname + '/../..')
  .parentBuilder()
  .testConfiguration()
  .unitTest()
  .parentBuilder()
  .withPreLaunchStep(function (context) {
    return new Promise(resolve => {
      // So something before istanbul is launch
      resolve();
    });
  })
  .withPreTestLaunchStep(function (context) {
      return new Promise(resolve => {
        // So something before jasmine is launch and after istanbul is started
        resolve();
      });
    })
  .withCleanUpStep(function (context) {
    return new Promise(resolve => {
      // Do some cleanup
      resolve();
    });
  });

testLauncher.configure(configBuilder.build())
  .then(() => testLauncher.run())
  .catch(error => {
    process.stderr.write(util.format("Something goes wrong: %s\n%s", error.message, error.stack));
  });
```

The reports will automatically created to ROOT_PROJECT/reports/test/unit
