/**
 * ```ts
 * import type { ServiceInfo } from "arangojs/services";
 * ```
 *
 * The "services" module provides types for Foxx services.
 *
 * @packageDocumentation
 */
import { FoxxManifest } from "./foxx-manifest.js";

//#region Service operation options
/**
 * Options for installing the service.
 *
 * See {@link Database#installService}.
 */
export type InstallServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
};

/**
 * Options for replacing a service.
 *
 * See {@link Database#replaceService}.
 */
export type ReplaceServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
  /**
   * Whether the existing service's "teardown" script should be executed
   * prior to removing that service.
   *
   * Default: `true`
   */
  teardown?: boolean;
  /**
   * If set to `true`, replacing a service that does not already exist will
   * fall back to installing the new service.
   *
   * Default: `false`
   */
  force?: boolean;
};

/**
 * Options for upgrading a service.
 *
 * See {@link Database#upgradeService}.
 */
export type UpgradeServiceOptions = {
  /**
   * An object mapping configuration option names to values.
   *
   * See also {@link Database#getServiceConfiguration}.
   */
  configuration?: Record<string, any>;
  /**
   * An object mapping dependency aliases to mount points.
   *
   * See also {@link Database#getServiceDependencies}.
   */
  dependencies?: Record<string, string>;
  /**
   * Whether the service should be installed in development mode.
   *
   * See also {@link Database#setServiceDevelopmentMode}.
   *
   * Default: `false`
   */
  development?: boolean;
  /**
   * Whether the service should be installed in legacy compatibility mode
   *
   * This overrides the `engines` option in the service manifest (if any).
   *
   * Default: `false`
   */
  legacy?: boolean;
  /**
   * Whether the "setup" script should be executed.
   *
   * Default: `true`
   */
  setup?: boolean;
  /**
   * Whether the existing service's "teardown" script should be executed
   * prior to upgrading that service.
   *
   * Default: `false`
   */
  teardown?: boolean;
  /**
   * Unless set to `true`, upgrading a service that does not already exist will
   * fall back to installing the new service.
   *
   * Default: `false`
   */
  force?: boolean;
};

/**
 * Options for uninstalling a service.
 *
 * See {@link Database#uninstallService}.
 */
export type UninstallServiceOptions = {
  /**
   * Whether the service's "teardown" script should be executed
   * prior to removing that service.
   *
   * Default: `true`
   */
  teardown?: boolean;
  /**
   * If set to `true`, uninstalling a service that does not already exist
   * will be considered successful.
   *
   * Default: `false`
   */
  force?: boolean;
};
//#endregion

//#region Service operation results
/**
 * Object briefly describing a Foxx service.
 */
export type ServiceSummary = {
  /**
   * Service mount point, relative to the database.
   */
  mount: string;
  /**
   * Name defined in the service manifest.
   */
  name?: string;
  /**
   * Version defined in the service manifest.
   */
  version?: string;
  /**
   * Service dependencies the service expects to be able to match as a mapping
   * from dependency names to versions the service is compatible with.
   */
  provides: Record<string, string>;
  /**
   * Whether development mode is enabled for this service.
   */
  development: boolean;
  /**
   * Whether the service is running in legacy compatibility mode.
   */
  legacy: boolean;
};

/**
 * Object describing a configuration option of a Foxx service.
 */
export type ServiceConfiguration = {
  /**
   * Data type of the configuration value.
   *
   * **Note**: `"int"` and `"bool"` are historical synonyms for `"integer"` and
   * `"boolean"`. The `"password"` type is synonymous with `"string"` but can
   * be used to distinguish values which should not be displayed in plain text
   * by software when managing the service.
   */
  type:
  | "integer"
  | "boolean"
  | "string"
  | "number"
  | "json"
  | "password"
  | "int"
  | "bool";
  /**
   * Current value of the configuration option as stored internally.
   */
  currentRaw: any;
  /**
   * Processed current value of the configuration option as exposed in the
   * service code.
   */
  current: any;
  /**
   * Formatted name of the configuration option.
   */
  title: string;
  /**
   * Human-readable description of the configuration option.
   */
  description?: string;
  /**
   * Whether the configuration option must be set in order for the service
   * to be operational.
   */
  required: boolean;
  /**
   * Default value of the configuration option.
   */
  default?: any;
};

/**
 * Object describing a single-service dependency defined by a Foxx service.
 */
export type SingleServiceDependency = {
  /**
   * Whether this is a multi-service dependency.
   */
  multiple: false;
  /**
   * Current mount point the dependency is resolved to.
   */
  current?: string;
  /**
   * Formatted name of the dependency.
   */
  title: string;
  /**
   * Name of the service the dependency expects to match.
   */
  name: string;
  /**
   * Version of the service the dependency expects to match.
   */
  version: string;
  /**
   * Human-readable description of the dependency.
   */
  description?: string;
  /**
   * Whether the dependency must be matched in order for the service
   * to be operational.
   */
  required: boolean;
};

/**
 * Object describing a multi-service dependency defined by a Foxx service.
 */
export type MultiServiceDependency = {
  /**
   * Whether this is a multi-service dependency.
   */
  multiple: true;
  /**
   * Current mount points the dependency is resolved to.
   */
  current?: string[];
  /**
   * Formatted name of the dependency.
   */
  title: string;
  /**
   * Name of the service the dependency expects to match.
   */
  name: string;
  /**
   * Version of the service the dependency expects to match.
   */
  version: string;
  /**
   * Human-readable description of the dependency.
   */
  description?: string;
  /**
   * Whether the dependency must be matched in order for the service
   * to be operational.
   */
  required: boolean;
};

/**
 * Test stats for a Foxx service's tests.
 */
export type ServiceTestStats = {
  /**
   * Total number of tests found.
   */
  tests: number;
  /**
   * Number of tests that ran successfully.
   */
  passes: number;
  /**
   * Number of tests that failed.
   */
  failures: number;
  /**
   * Number of tests skipped or not executed.
   */
  pending: number;
  /**
   * Total test duration in milliseconds.
   */
  duration: number;
};

/**
 * Test results for a Foxx service's tests using the stream reporter.
 */
export type ServiceTestStreamReport = (
  | ["start", { total: number }]
  | ["pass", ServiceTestStreamTest]
  | ["fail", ServiceTestStreamTest]
  | ["end", ServiceTestStats]
)[];

/**
 * Test results for a single test case using the stream reporter.
 */
export type ServiceTestStreamTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * Test results for a Foxx service's tests using the suite reporter.
 */
export type ServiceTestSuiteReport = {
  stats: ServiceTestStats;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * Test results for a single test suite using the suite reporter.
 */
export type ServiceTestSuite = {
  title: string;
  suites: ServiceTestSuite[];
  tests: ServiceTestSuiteTest[];
};

/**
 * Test results for a single test case using the suite reporter.
 */
export type ServiceTestSuiteTest = {
  result: "pending" | "pass" | "fail";
  title: string;
  duration: number;
  err?: any;
};

/**
 * Test results for a Foxx service's tests in XUnit format using the JSONML
 * representation.
 */
export type ServiceTestXunitReport = [
  "testsuite",
  {
    timestamp: number;
    tests: number;
    errors: number;
    failures: number;
    skip: number;
    time: number;
  },
  ...ServiceTestXunitTest[],
];

/**
 * Test results for a single test case in XUnit format using the JSONML
 * representation.
 */
export type ServiceTestXunitTest =
  | ["testcase", { classname: string; name: string; time: number }]
  | [
    "testcase",
    { classname: string; name: string; time: number },
    ["failure", { message: string; type: string }, string],
  ];

/**
 * Test results for a Foxx service's tests in TAP format.
 */
export type ServiceTestTapReport = string[];

/**
 * Test results for a Foxx service's tests using the default reporter.
 */
export type ServiceTestDefaultReport = {
  stats: ServiceTestStats;
  tests: ServiceTestDefaultTest[];
  pending: ServiceTestDefaultTest[];
  failures: ServiceTestDefaultTest[];
  passes: ServiceTestDefaultTest[];
};

/**
 * Test results for a single test case using the default reporter.
 */
export type ServiceTestDefaultTest = {
  title: string;
  fullTitle: string;
  duration: number;
  err?: string;
};

/**
 * OpenAPI 2.0 description of a Foxx service.
 */
export type SwaggerJson = {
  [key: string]: any;
  info: {
    title: string;
    description: string;
    version: string;
    license: string;
  };
  path: {
    [key: string]: any;
  };
};
//#endregion

//#region ServiceDescription
/**
 * Object describing a Foxx service in detail.
 */
export type ServiceDescription = {
  /**
   * Service mount point, relative to the database.
   */
  mount: string;
  /**
   * File system path of the service.
   */
  path: string;
  /**
   * Name defined in the service manifest.
   */
  name?: string;
  /**
   * Version defined in the service manifest.
   */
  version?: string;
  /**
   * Whether development mode is enabled for this service.
   */
  development: boolean;
  /**
   * Whether the service is running in legacy compatibility mode.
   */
  legacy: boolean;
  /**
   * Content of the service manifest of this service.
   */
  manifest: FoxxManifest;
  /**
   * Internal checksum of the service's initial source bundle.
   */
  checksum: string;
  /**
   * Options for this service.
   */
  options: {
    /**
     * Configuration values set for this service.
     */
    configuration: Record<string, any>;
    /**
     * Service dependency configuration of this service.
     */
    dependencies: Record<string, string>;
  };
};
//#endregion