---
name: arangojs-development
description: Maintain and extend the arangojs repository. Use for driver features and bug fixes, public API or TypeScript type changes, request and response mapping, connection or retry behavior, cursors and jobs, dependencies, documentation, and test selection. Not a guide to using arangojs in an application.
---

# arangojs development

Apply the repository's [AGENTS.md](../../../AGENTS.md). Work from current source,
tests, package configuration, and CI rather than assuming another driver has the
same API or transport behavior.

## Locate the contract

Classify the task as a bug, feature, compatibility change, or refactor. Identify
the observable contract before choosing the implementation layer:

- For a bug, establish a reproducer and the boundary that violates its contract.
  Where practical, demonstrate that the regression fails before the fix and
  passes afterward.
- For a feature, verify the ArangoDB HTTP API and applicable server versions.
- For a refactor, identify the public behavior, types, errors, and request shape
  that must remain unchanged.

Trace one neighboring operation with the same request and response shape. Follow
it from its public types and method through the owning handle or `Database`,
`Database.request`, `Connection.request`, response transformation, and tests.

## Load detail only when needed

| Work                                                                    | Read                                                                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Find ownership or trace request flow                                    | [Architecture](references/architecture.md)                                                        |
| Add or change a public method, option, result, endpoint, or TSDoc       | [Change guide: APIs and wire mapping](references/changes.md#public-apis-and-wire-mapping)         |
| Change connection, retries, errors, hooks, authentication, or transport | [Change guide: connection and transport](references/changes.md#connection-retries-and-transport)  |
| Change cursors, jobs, transactions, or other stateful behavior          | [Change guide: stateful operations](references/changes.md#stateful-operations)                    |
| Change dependencies, packaging, module output, or browser behavior      | [Change guide: packaging and runtimes](references/changes.md#packaging-dependencies-and-runtimes) |
| Add tests or select validation commands                                 | [Testing](references/testing.md)                                                                  |

## Implement and validate

Keep a coherent change together: public types and overloads, runtime request and
response behavior, TSDoc, exports, and regression coverage. Prefer the repository's
existing helpers and patterns. Do not edit generated output.

Start with the smallest meaningful database-free or focused check. Expand based
on the contracts touched rather than running or claiming the entire CI matrix.
Confirm that the intended tests executed; a successful build, an empty test
selection, or skipped cases are not behavioral validation.

Review the final diff for accidental public API changes, unsafe retry changes,
environment-specific assumptions, stale generated output, and unrelated edits.
Report checks and untested relevant variants as required by `AGENTS.md`.
