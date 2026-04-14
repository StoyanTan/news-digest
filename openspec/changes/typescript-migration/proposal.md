## Why

The current codebase is plain JavaScript ES modules with no type safety, making it harder to maintain and extend as the project grows toward production. Migrating to TypeScript will catch bugs at compile time, improve IDE support, and make the codebase easier to reason about.

## What Changes

- Replace `digest.js` → `digest.ts` with typed CLI args, API response shapes, and messenger interfaces
- Replace `scheduler.js` → `scheduler.ts` with typed config and process management
- Replace `setup.js` → `setup.ts` with typed env variable definitions
- Add `tsconfig.json` configured for Node.js 18+, ES modules, strict mode
- Add `tsx` (or `ts-node`) as a dev dependency for running TypeScript directly
- Update `package.json` scripts to use `tsx` runner and add a `build` script
- Add type declarations for env vars (e.g. typed `process.env` via declaration file)

## Capabilities

### New Capabilities

- `typescript-runtime`: TypeScript compilation and execution setup (`tsconfig.json`, `tsx`, build script, typed `process.env`)
- `typed-digest`: Type-safe digest generation — typed CLI args, Claude API response, messenger payload shapes
- `typed-scheduler`: Type-safe scheduler — typed config, process spawn options, log output
- `typed-setup`: Type-safe setup wizard — typed env var schema and validation

### Modified Capabilities

<!-- No existing OpenSpec specs — this is a greenfield migration -->

## Impact

- **Files changed**: `digest.js`, `scheduler.js`, `setup.js`, `package.json`
- **New files**: `tsconfig.json`, `src/types/env.d.ts` (or similar)
- **Dependencies added**: `tsx` (dev), `typescript` (dev), `@types/node` (dev), `@types/nodemailer` (dev)
- **No API or behavior changes** — this is a pure implementation migration; all CLI flags, env vars, and messenger outputs remain identical
