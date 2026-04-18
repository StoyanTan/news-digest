## 1. Dependencies & Config

- [x] 1.1 Install dev dependencies: `typescript`, `tsx`, `@types/node`, `@types/nodemailer`
- [x] 1.2 Add `tsconfig.json` with `NodeNext` module resolution, strict mode, Node 18+ target
- [x] 1.3 Add `dist/` to `.gitignore`
- [x] 1.4 Add `types/env.d.ts` extending `NodeJS.ProcessEnv` with all keys from `.env.example`

## 2. Migrate digest.js

- [x] 2.1 Rename `digest.js` to `digest.ts`
- [x] 2.2 Define `CliOptions` interface and cast `parseArgs` result against it
- [x] 2.3 Define `MessengerFn = (content: string) => Promise<void>` and type all three messenger functions against it
- [x] 2.4 Type Claude API request and response using `@anthropic-ai/sdk` types (remove any `any` casts)
- [x] 2.5 Verify web search fallback retry path is type-safe

## 3. Migrate scheduler.js

- [x] 3.1 Rename `scheduler.js` to `scheduler.ts`
- [x] 3.2 Define `SchedulerConfig` interface and populate from env vars with correct numeric types
- [x] 3.3 Type `spawnDigest` function with `string[]` args and typed `SpawnOptions`
- [x] 3.4 Ensure log timestamps use `new Date().toISOString()` typed as `string`
- [x] 3.5 Add minimal `--help` flag printing usage for `--run-now`, `SCHEDULE_HOUR`, `SCHEDULE_MINUTE`, `MESSENGER`

## 4. Migrate setup.js

- [x] 4.1 Rename `setup.js` to `setup.ts`
- [x] 4.2 Define `EnvVarEntry` interface `{ key: string; description: string; required: boolean; default?: string }`
- [x] 4.3 Type prompt result collection as `Record<string, string>`
- [x] 4.4 Type messenger selection as `"telegram" | "discord" | "email"` union with re-prompt on invalid input

## 5. Update package.json

- [x] 5.1 Update `start`, `test`, and `setup` scripts to use `tsx`
- [x] 5.2 Add `build` script: `tsc --noEmit`
- [x] 5.3 Update `main` field to `digest.ts`

## 6. Verify

- [x] 6.1 Run `npx tsc --noEmit` — zero type errors
- [x] 6.2 Run `npm test` (dry run) — executes successfully end-to-end
- [x] 6.3 Run `node scheduler.ts --help` — prints help text
