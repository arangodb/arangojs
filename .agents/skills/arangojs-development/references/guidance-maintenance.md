# Maintaining agent guidance

Keep contributor instructions consistent with the driver. This workflow runs
within an active development task or an explicit guidance audit; it does not
watch commits or schedule background updates. Respect the user's requested edit
or review-only scope.

## Choose the scope

For normal development, check the completed task's changes for effects on
documented architecture, compatibility, build commands, test setup, or CI
coverage. Include committed changes against the task's base when reviewing a
branch, as well as relevant staged, unstaged, and new files. A working-tree diff
alone can miss changes already committed or merged into the branch.

Inspect only the affected guidance and its source evidence. A bug fix that
preserves the documented contributor workflow may need no guidance edit. Do not
expand every task into a repository-wide audit.

For an explicit audit or refresh, compare all current agent guidance with the
current repository, even when there are no driver changes. This includes
`AGENTS.md`, `SKILL.md`, the skill references and metadata, and the thin
`CLAUDE.md` and `GEMINI.md` pointers. An example request is:

> Use $arangojs-development to audit and refresh the repository's agent guidance
> against the current source, package scripts, tests, and CI.

## Compare with authoritative evidence

Paths below are repository-relative starting points. Read the relevant
implementation and configuration rather than inferring behavior from filenames,
old guidance, or the locally installed environment.

| Change or documented claim                                               | Evidence to inspect                                                                                 | Guidance usually affected                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Build, module outputs, exports, dependencies, or runtime requirements    | `package.json`, `tsconfig.json`, `tsconfig.esm.json`, `tsconfig.cjs.json`, `tsconfig.dts.json`      | Architecture, packaging/change guidance, testing; root rules if universal |
| Test commands, browsers, server versions, topology, or protocol coverage | `.circleci/config.yml`, `src/test/_config.ts`, affected tests, `browser-test.mjs`, `smoke-test.mjs` | Testing and relevant architecture/change guidance                         |
| Database setup, fixtures, or deployment prerequisites                    | `docker/start_db.sh`, relevant fixtures and CI setup                                                | Testing prerequisites and reproduction instructions                       |
| Module ownership, request flow, retries, or stateful behavior            | Affected `src/` implementation and regression tests                                                 | Architecture and the relevant change-guide section                        |
| Agent workflow, discovery, or reference organization                     | `AGENTS.md`, `.agents/skills/arangojs-development/`, `CLAUDE.md`, `GEMINI.md`                       | Shared rules, skill routing, links, or metadata as applicable             |

For example, adding Firefox integration jobs should prompt a check of browser
commands, prerequisites, selection options, and coverage in the testing guide.
Inspect both the CI jobs and browser runner; smoke coverage and integration-suite
coverage are different. A matrix entry describes configured CI coverage, not a
successful local test run or a new public support guarantee.

## Update and validate

Correct only statements affected by the evidence. Keep universal rules in
`AGENTS.md`, workflow and routing in `SKILL.md`, and conditional detail in the
references. Preserve thin tool-specific pointers and keep metadata consistent
when the skill's scope changes. Prefer links to authoritative configuration over
duplicating exhaustive matrices or command lists.

Preserve accurate guidance. Do not turn an environment limitation, transient
failure, or unverified assumption into a new compatibility rule or test skip.
When evidence is missing or contradictory, report the exact discrepancy and
what remains unverified.

Check relative links and anchors, referenced paths, skill frontmatter, and any
affected metadata. Check formatting and run `git diff --check`. Verify documented
commands against their scripts and prerequisites; do not execute a destructive
suite merely to validate documentation. Use the
[testing guide](testing.md#choosing-validation) for checks appropriate to any
driver changes. Report the scope checked, guidance updates or why none were
needed, checks actually run, and unresolved discrepancies.

## Finish after one pass

Perform one maintenance pass for the completed driver changes or requested
audit. Do not recursively invoke this skill or treat its own guidance edits as
a new trigger. Fixing links or formatting during validation remains part of the
same pass and does not restart the audit.

Finish after the updates and validation. If the same check still fails after a
targeted correction, report the remaining failure instead of retrying it
indefinitely. A new pass requires new driver changes affecting the checked scope
or a new explicit audit request. Do not add a watcher, scheduled task, or CI
automation as part of maintaining these instructions unless separately requested.
