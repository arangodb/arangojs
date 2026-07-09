# ArangoDB 4.0 removed driver methods

The following driver methods are deprecated because the corresponding APIs were removed in ArangoDB 4.0. Calling these methods against ArangoDB v4+ will result in runtime exceptions.

| S.No | Method Name | Area | File Path | Deprecated Message |
|------|-------------|------|-----------|---------------------|
| 1 | `route` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 2 | `executeTransaction` | JavaScript transactions | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 3 | `listUserFunctions` | AQL user functions | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 4 | `createUserFunction` | AQL user functions | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 5 | `dropUserFunction` | AQL user functions | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 6 | `listServices` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 7 | `installService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 8 | `replaceService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 9 | `upgradeService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 10 | `uninstallService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 11 | `getService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 12 | `getServiceConfiguration` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 13 | `replaceServiceConfiguration` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 14 | `updateServiceConfiguration` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 15 | `getServiceDependencies` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 16 | `replaceServiceDependencies` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 17 | `updateServiceDependencies` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 18 | `setServiceDevelopmentMode` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 19 | `getServiceScripts` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 20 | `runServiceScript` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 21 | `runServiceTests` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 22 | `getServiceReadme` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 23 | `getServiceDocumentation` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 24 | `downloadService` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 25 | `commitLocalServiceState` | Foxx | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
