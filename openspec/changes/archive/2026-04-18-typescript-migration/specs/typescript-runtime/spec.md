## ADDED Requirements

### Requirement: TypeScript compilation is configured for Node.js ES modules
The project SHALL include a `tsconfig.json` that targets Node.js 18+, uses `NodeNext` module resolution, enables strict mode, and outputs compiled JS to a `dist/` directory.

#### Scenario: Valid TypeScript compiles without errors
- **WHEN** the developer runs `npm run build`
- **THEN** TypeScript compiles all `.ts` source files into `dist/` with no type errors

#### Scenario: Strict mode catches implicit any
- **WHEN** a variable is declared without a type annotation and the type cannot be inferred
- **THEN** the TypeScript compiler emits an error

### Requirement: TypeScript sources can be executed directly without a build step
The project SHALL use `tsx` as a dev dependency so that `.ts` files can be run directly via `node --import tsx/esm` or `npx tsx`.

#### Scenario: Running a script directly
- **WHEN** the developer runs `npx tsx digest.ts --topic "AI" --dry`
- **THEN** the script executes without pre-compilation

### Requirement: Environment variables are typed
The project SHALL include a declaration file (e.g. `src/types/env.d.ts`) that extends `NodeJS.ProcessEnv` with typed keys for all variables defined in `.env.example`.

#### Scenario: Accessing a known env var
- **WHEN** code reads `process.env.ANTHROPIC_API_KEY`
- **THEN** TypeScript infers the type as `string | undefined` with no type error

#### Scenario: Accessing an unknown env var
- **WHEN** code reads `process.env.UNKNOWN_VAR` (not in the declaration)
- **THEN** TypeScript infers `string | undefined` (standard NodeJS fallback — no compile error, but no autocomplete)

### Requirement: package.json scripts are updated for TypeScript
The `package.json` SHALL include: a `build` script (`tsc`), an updated `test` script using `tsx`, and updated `start`/run scripts using `tsx`.

#### Scenario: Running tests after migration
- **WHEN** the developer runs `npm test`
- **THEN** the dry-run executes via `tsx digest.ts --topic "Artificial Intelligence" --dry`
