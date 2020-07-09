/**
 * ```ts
 * import type { FoxxManifest } from "arangojs/util/foxx-manifest";
 * ```
 *
 * The "util/foxx-manifest" module provides the Foxx manifest type for
 * TypeScript.
 *
 * Generated from {@link http://json.schemastore.org/foxx-manifest | JSON Schema}
 * using `json-schema-to-typescript`.
 *
 * @packageDocumentation
 */

import { Dict } from "./types";

/**
 * Schema for ArangoDB Foxx service manifests.
 */
export type FoxxManifest = {
  /**
   * An object defining the configuration options this service requires.
   */
  configuration?: Dict<Configuration>;
  /**
   * If specified, the / (root) route of the service will automatically redirect to the given relative path, e.g. "index.html".
   */
  defaultDocument?: string;
  /**
   * The dependencies this service uses, i.e. which APIs its dependencies need to be compatible with.
   */
  dependencies?: Dict<string | Dependency>;
  /**
   * The dependencies this provides, i.e. which APIs it claims to be compatible with.
   */
  provides?: Dict<string>;
  /**
   * An object indicating the semantic version ranges of ArangoDB (or compatible environments) the service will be compatible with.
   */
  engines?: Dict<string> & {
    arangodb?: string;
  };
  /**
   * An object defining file assets served by this service.
   */
  files?: Dict<string | File>;
  /**
   * The relative path to the Foxx JavaScript files in the service, e.g. "lib". Defaults to the folder containing this manifest.
   */
  lib?: string;
  /**
   * The relative path to the main entry point of this service (relative to lib), e.g. "index.js".
   */
  main?: string;
  /**
   * An object defining named scripts provided by this service, which can either be used directly or as queued jobs by other services.
   */
  scripts?: Dict<string>;
  /**
   * A path/pattern or list of paths/patterns of JavaScript tests provided for this service.
   */
  tests?: string | string[];
  /**
   * The full name of the author of the service (i.e. you). This will be shown in the web interface.
   */
  author?: string;
  /**
   * A list of names of people that have contributed to the development of the service in some way. This will be shown in the web interface.
   */
  contributors?: string[];
  /**
   * A human-readable description of the service. This will be shown in the web interface.
   */
  description?: string;
  /**
   * A list of keywords that help categorize this service. This is used by the Foxx Store installers to organize services.
   */
  keywords?: string[];
  /**
   * A string identifying the license under which the service is published, ideally in the form of an SPDX license identifier. This will be shown in the web interface.
   */
  license?: string;
  /**
   * The name of the Foxx service. This will be shown in the web interface.
   */
  name?: string;
  /**
   * The filename of a thumbnail that will be used alongside the service in the web interface. This should be a JPEG or PNG image that looks good at sizes 50x50 and 160x160.
   */
  thumbnail?: string;
  /**
   * The version number of the Foxx service. The version number must follow the semantic versioning format. This will be shown in the web interface.
   */
  version?: string;
};

/**
 * A configuration option.
 */
export type Configuration = {
  /**
   * A human-readable description of the option.
   */
  description?: string;
  /**
   * The type of value expected for this option.
   */
  type:
    | "integer"
    | "boolean"
    | "number"
    | "string"
    | "json"
    | "password"
    | "int"
    | "bool";
  /**
   * The default value for this option in plain JSON. Can be omitted to provide no default value.
   */
  default?: any;
  /**
   * Whether the service can not function without this option. Defaults to true unless a default value is provided.
   */
  required?: boolean;
};

/**
 * A service dependency.
 */
export type Dependency = {
  /**
   * Name of the API the service expects.
   */
  name?: string;
  /**
   * The semantic version ranges of the API the service expects.
   */
  version?: string;
  /**
   * A description of how the API is used or why it is needed.
   */
  description?: string;
  /**
   * Whether the service can not function without this dependency.
   */
  required?: boolean;
  /**
   * Whether the dependency can be specified more than once.
   */
  multiple?: boolean;
};

/**
 * A service file asset.
 */
export type File = {
  /**
   * Relative path of the file or folder within the service.
   */
  path: string;
  /**
   * If set to true the file will be served with gzip-encoding if supported by the client. This can be useful when serving text files like client-side JavaScript, CSS or HTML.
   */
  gzip?: boolean;
  /**
   * The MIME content type of the file. Defaults to an intelligent guess based on the filename's extension.
   */
  type?: string;
};
