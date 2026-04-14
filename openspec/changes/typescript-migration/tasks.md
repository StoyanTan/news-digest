## 1. Dependencies & Config

- [ ] 1.1 Install dev dependencies: `typescript`, `tsx`, `@types/node`, `@types/nodemailer`
- [ ] 1.2 Add `tsconfig.json` with `NodeNext` module resolution, strict mode, Node 18+ target
- [ ] 1.3 Add `dist/` to `.gitignore`
- [ ] 1.4 Add `types/env.d.ts` extending `NodeJS.ProcessEnv` with all keys from `.env.example`

## 2. Migrate digest.js

- [ ] 2.1 Rename `digest.js` to `digest.ts`
- [ ] 2.2 Define `CliOptions` interface and cast `parseArgs` result against it
- [ ] 2.3 Define `MessengerFn = (content: string) => Promise<void>` and type all three messenger functions against it
- [ ] 2.4 Type Claude API request and response using `@anthropic-ai/sdk` types (remove any `any` casts)
- [ ] 2.5 Verify web search fallback retry path is type-safe

## 3. Migrate scheduler.js

- [ ] 3.1 Rename `scheduler.js` to `scheduler.ts`
- [ ] 3.2 Define `SchedulerConfig` interface and populate from env vars with correct numeric types
- [ ] 3.3 Type `spawnDigest` function with `string[]` args and typed `SpawnOptions`
- [ ] 3.4 Ensure log timestamps use `new Date().toISOString()` typed as `string`
- [ ] 3.5 Add minimal `--help` flag printing usage for `--run-now`, `SCHEDULE_HOUR`, `SCHEDULE_MINUTE`, `MESSENGER`

## 4. Migrate setup.js

- [ ] 4.1 Rename `setup.js` to `setup.ts`
- [ ] 4.2 Define `EnvVarEntry` interface `{ key: string; description: string; required: boolean; default?: string }`
- [ ] 4.3 Type prompt result collection as `Record<string, string>`
- [ ] 4.4 Type messenger selection as `"telegram" | "discord" | "email"` union with re-prompt on invalid input

## 5. Update package.json

- [ ] 5.1 Update `start`, `test`, and `setup` scripts to use `tsx`
- [ ] 5.2 Add `build` script: `tsc --noEmit`
- [ ] 5.3 Update `main` field to `digest.ts`

## 6. Verify

- [ ] 6.1 Run `npx tsc --noEmit` — zero type errors
- [ ] 6.2 Run `npm test` (dry run) — executes successfully end-to-end
- [ ] 6.3 Run `node scheduler.ts --help` — prints help text
