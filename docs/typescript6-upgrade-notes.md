# Technical notes — TypeScript 6 upgrade

Brief reference for the driver toolchain upgrade from TypeScript 5.4 to **6.0.3**. These are **development-only** changes; the published npm package API and runtime behavior are unchanged.

---

## Summary


| Area                  | Before                    | After                                       |
| --------------------- | ------------------------- | ------------------------------------------- |
| TypeScript            | `^5.4.2`                  | `^6.0.3`                                    |
| TypeDoc               | `^0.25.12`                | `^0.28.19`                                  |
| Global types          | Implicit (all `@types/`*) | Explicit `node`, `mocha` in `tsconfig.json` |
| CJS module resolution | `"Node"` (node10)         | `"Bundler"` with `"module": "CommonJS"`     |


---

## What changed

### 1. TypeScript 6 (`package.json`)

The driver is built and type-checked with the latest TypeScript 6 release. This keeps the project on a supported compiler and unblocks future maintenance (TS 7 will remove several legacy options).

**Why:** TypeScript 5.4 is no longer the target for new driver work; CI and contributors need a compiler that matches current ecosystem expectations.

**Impact:**

- **Consumers of the published package:** None. Users install `arangojs` from npm; they use their own TypeScript version. Published `.d.ts` files are the same contract as before.
- **Contributors:** Must use `typescript@^6.0.3` (installed via `npm install` on Linux/macOS). Local `tsc` and CI builds compile with TS 6 rules.

### 2. Explicit `compilerOptions.types` (`tsconfig.json`)

```json
"types": ["node", "mocha"]
```

**Why:** TypeScript 6 stopped auto-including every package under `node_modules/@types`. Without an explicit list, the build failed with hundreds of errors (`Cannot find name 'process'`, `describe`, `Buffer`, etc.) because Node and Mocha globals were invisible to the compiler.

**Impact:**

- Build and typecheck only load **Node** and **Mocha** ambient types. Test files and driver source that rely on those globals compile correctly.
- If new global types are needed later (e.g. browser APIs in a specific test), add them to this array or use a dedicated `tsconfig` for that target.

### 3. CJS `moduleResolution: "Bundler"` (`tsconfig.cjs.json`)

The CommonJS emit pass now uses:

```json
{
  "module": "CommonJS",
  "moduleResolution": "Bundler"
}
```

Previously: `"moduleResolution": "Node"` (maps to deprecated **node10**).

**Why:** TypeScript 6 rejects node10 resolution (`TS5107`) and will remove it in TypeScript 7. `"Bundler"` is the recommended pairing for CommonJS output in dual-package setups that previously used node10.

**Impact:**

- **CJS build (`build/cjs/`):** Emits successfully; import resolution behavior remains suitable for Node `require()`.
- **ESM build (`build/esm/`):** Unchanged; still extends the base config with ESM-oriented settings from `@tsconfig/node20`.

### 4. TypeDoc 0.28.19 (`package.json`, `typedoc.json`)

TypeDoc `0.25.x` declares a peer dependency on TypeScript ≤ 5.4, so `npm install` failed once TypeScript was bumped to 6.

**Changes:**

- `typedoc` → `^0.28.19` (first release with TS 6 support).
- `typedoc.json`: added `sourceLinkTemplate`; kept `disableGit: true` (TypeDoc 0.28 requires `sourceLinkTemplate` when git linking is disabled).

```json
{
  "disableGit": true,
  "basePath": "./src",
  "sourceLinkTemplate": "https://github.com/arangodb/arangojs/blob/main/src/{path}#L{line}"
}
```

With `disableGit: true`, `{path}` is relative to `basePath` (`databases.ts`, not `src/databases.ts`), so the template must include the `src/` prefix. Using `disableGit: false` with the same template produced broken links (`src/src/databases.ts`).

**Why:** The [docs workflow](../.github/workflows/docs.yml) runs TypeDoc on release tags. Without a TS-6-compatible TypeDoc, doc generation would fail after this upgrade.

**Impact:**

- **Published API docs (gh-pages):** Continue to build on tag push; CLI `--sourceLinkTemplate` in the workflow overrides the branch/commit in the URL for each release.
- **Local doc preview:** `npx typedoc --options typedoc.json` then `npx serve tsdoc`; verify source links open `.../src/<file>.ts#L<n>` (not `src/src/...`).

---

## Verification checklist

After pulling these changes:

```bash
npm install          # Linux/macOS CI; see Windows note below
npm run build        # ESM + CJS + .d.ts outputs under build/
npx tsc -p tsconfig.json --noEmit
npx typedoc --options typedoc.json
npm test             # requires running ArangoDB (CircleCI)
```

Expected artifacts:

- `build/index.d.ts` — declaration entry
- `build/esm/` — ESM JavaScript
- `build/cjs/` — CommonJS JavaScript

---

## References

- [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [TypeDoc 0.28.18 — TypeScript 6 support](https://github.com/TypeStrong/typedoc/releases/tag/v0.28.18)
- [CHANGELOG](../CHANGELOG.md) — `[Unreleased]` section

