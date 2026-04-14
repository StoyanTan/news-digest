## ADDED Requirements

### Requirement: Scheduler config is typed
`scheduler.ts` SHALL define a typed `SchedulerConfig` interface covering `hour`, `minute`, `messenger`, `topic`, `articleCount`, and `runNow` fields sourced from environment variables and CLI args.

#### Scenario: Config is built from env vars
- **WHEN** `SCHEDULE_HOUR=9` and `SCHEDULE_MINUTE=30` are set in the environment
- **THEN** `config.hour === 9` and `config.minute === 30` with numeric types (not strings)

### Requirement: Child process spawn is typed
The `spawnDigest` function SHALL use typed `SpawnOptions` from Node's `child_process` module and accept a typed argument array.

#### Scenario: Spawning digest process
- **WHEN** `spawnDigest` is called with a topic and messenger
- **THEN** the spawned command arguments array is `string[]` with no `any` casts

### Requirement: Log output uses typed timestamps
Log entries written to `digest-schedule.log` SHALL include an ISO timestamp produced via `new Date().toISOString()` typed as `string`.

#### Scenario: Log entry format
- **WHEN** the scheduler fires or an error occurs
- **THEN** the log line is structured as `[ISO_TIMESTAMP] MESSAGE\n` with TypeScript enforcing string concatenation
