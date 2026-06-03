# ArangoDB 4.0 removed driver methods

The following driver methods are deprecated because the corresponding APIs were removed in ArangoDB 4.0. Calling these methods against ArangoDB v4+ will result in runtime exceptions.

| S.No | Method Name | File Path | Deprecated Message |
|------|-------------|-----------|---------------------|
| 1 | `route` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 2 | `executeTransaction` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 3 | `listUserFunctions` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 4 | `createUserFunction` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 5 | `dropUserFunction` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 6 | `listServices` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 7 | `installService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 8 | `replaceService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 9 | `upgradeService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 10 | `uninstallService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 11 | `getService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 12 | `getServiceConfiguration` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 13 | `replaceServiceConfiguration` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 14 | `updateServiceConfiguration` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 15 | `getServiceDependencies` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 16 | `replaceServiceDependencies` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 17 | `updateServiceDependencies` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 18 | `setServiceDevelopmentMode` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 19 | `getServiceScripts` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 20 | `runServiceScript` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 21 | `runServiceTests` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 22 | `getServiceReadme` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 23 | `getServiceDocumentation` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 24 | `downloadService` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
| 25 | `commitLocalServiceState` | `src/databases.ts` | Removed from ArangoDB 4.0 onwards. |
