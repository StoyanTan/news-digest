## Context

The project is three plain JS ES module scripts (`digest.js`, `scheduler.js`, `setup.js`) plus `package.json`. There is no build step — files are run directly with `node`. The project uses `"type": "module"` and targets Node.js ≥ 18.

Current pain points: no type safety on CLI args (all parsed as strings), no types on Claude API responses, env vars accessed as untyped `process.env` strings, messenger functions have no shared interface.

## Goals / Non-Goals

**Goals:**
- Add TypeScript with strict mode, keeping the same zero-build-for-dev experience via `tsx`
- Type all boundaries: CLI args, env vars, Claude API response, messenger signatures
- Keep all existing CLI flags, env var names, and output behavior identical

**Non-Goals:**
- Changing any runtime behavior or CLI interface
- Adding a CI/CD pipeline (separate change)
- Migrating to a different module system or bundler
- Adding unit tests (can follow as a separate change)

## Decisions

### 1. Use `tsx` for development execution, `tsc` for build-only validation

**Decision:** `tsx` (ESM-aware TS runner) replaces `node` in all npm scripts. `tsc --noEmit` runs as a typecheck/build step.

**Why:** `tsx` runs `.ts` files directly without a `dist/` step, preserving the current dev experience (`npx tsx digest.ts --topic "AI" --dry` feels identical to `node digest.js ...`). `tsc` handles type checking and optional `dist/` output for production use.

**Alternatives considered:**
- `ts-node` — does not support ESM modules cleanly without extra config
- `bun` — not universally available, adds a runtime dependency beyond Node.js

### 2. Keep file names at root level (no `src/` directory)

**Decision:** Rename `digest.js → digest.ts`, `scheduler.js → scheduler.ts`, `setup.js → setup.ts` in place. No `src/` restructure.

**Why:** Moving files would change all documented CLI invocations in README and QUICKSTART. The project is small enough that a flat structure is fine. Avoids breaking `main` in `package.json` and any user-configured paths.

**Alternatives considered:**
- `src/` layout with `dist/` output — adds friction, breaks existing docs, unnecessary for 3 files

### 3. Env var types via declaration merging on `NodeJS.ProcessEnv`

**Decision:** Add `types/env.d.ts` that merges into `NodeJS.ProcessEnv` with all `.env.example` keys typed as `string | undefined`.

**Why:** Declaration merging is the standard pattern for typed env vars in Node.js without a runtime library. No extra dependency needed.

**Alternatives considered:**
- `zod` env parsing — adds a runtime dependency and validation logic that is out of scope here
- `dotenv` with `dotenv-safe` — changes the existing manual env loader without clear benefit

### 4. Messenger interface as a type alias, not a class hierarchy

**Decision:** Define `type MessengerFn = (content: string) => Promise<void>` and assert each function against it. No classes or abstract types.

**Why:** The three messenger functions are already standalone async functions. Wrapping them in a class or interface hierarchy adds indirection without benefit for three functions that will never be dynamically loaded.

## Risks / Trade-offs

- **`tsx` version compatibility with Node 18 ESM** → Mitigation: pin `tsx` to a known-good version (≥4.x) and test with `npm test` immediately after migration
- **`parseArgs` return type** — Node's built-in `parseArgs` uses complex generics; the parsed `values` object may need a cast. → Mitigation: define an explicit `CliOptions` interface and cast the result once at the call site
- **`nodemailer` types** — `@types/nodemailer` is a community package that may lag. → Mitigation: install `@types/nodemailer` as a dev dep; if types are stale, use a minimal local type shim

## Migration Plan

1. Install dev dependencies: `typescript`, `tsx`, `@types/node`, `@types/nodemailer`
2. Add `tsconfig.json`
3. Add `dist/` to `.gitignore`
4. Add `types/env.d.ts`
5. Rename and migrate `digest.js → digest.ts`
6. Rename and migrate `scheduler.js → scheduler.ts` (include minimal `--help` flag)
7. Rename and migrate `setup.js → setup.ts`
8. Update `package.json` scripts
9. Run `npm test` (dry run) and `npx tsc --noEmit` to verify

**Rollback:** The original `.js` files are in git history. `git revert` or restoring the files + reverting `package.json` is sufficient.

## Open Questions

~~- Should `dist/` output be committed or `.gitignore`d?~~ **Resolved:** Add `dist/` to `.gitignore`. No current consumer; commit only when a CI/CD pipeline exists.

~~- Should `scheduler.ts` expose a `--help` flag consistent with `digest.ts`?~~ **Resolved:** Add a minimal `--help` flag covering `--run-now`, `SCHEDULE_HOUR`, `SCHEDULE_MINUTE`, and `MESSENGER`. Include in this migration.
