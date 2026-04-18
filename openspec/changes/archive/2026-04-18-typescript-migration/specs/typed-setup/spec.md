## ADDED Requirements

### Requirement: Env var schema is typed
`setup.ts` SHALL define a typed `EnvSchema` structure listing each variable's key, description, required flag, and optional default value.

#### Scenario: Schema entry has required fields
- **WHEN** the schema array is defined
- **THEN** each entry conforms to `{ key: string; description: string; required: boolean; default?: string }` with no missing fields caught at compile time

### Requirement: User prompts produce typed output
The interactive prompt loop SHALL collect responses into a `Record<string, string>` and write them to `.env` without `any` types.

#### Scenario: Writing collected values to .env
- **WHEN** the user completes all prompts
- **THEN** the output is written by iterating a `Record<string, string>` with typed key-value pairs

### Requirement: Messenger selection is a typed union
The messenger choice prompt SHALL validate input against the union type `"telegram" | "discord" | "email"` and re-prompt on invalid input.

#### Scenario: Valid messenger selection
- **WHEN** the user enters "discord"
- **THEN** the value is accepted and typed as the literal `"discord"`

#### Scenario: Invalid messenger selection
- **WHEN** the user enters an unrecognized string
- **THEN** the prompt repeats with an error message listing valid options
