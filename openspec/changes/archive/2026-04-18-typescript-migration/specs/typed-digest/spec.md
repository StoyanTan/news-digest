## ADDED Requirements

### Requirement: CLI arguments are parsed with typed options
`digest.ts` SHALL define a typed interface for CLI options (topic, count, messenger, dry, output) and parse `process.argv` into that interface.

#### Scenario: Valid CLI args produce typed object
- **WHEN** the script is invoked with `--topic "Finance" --count 3 --messenger discord`
- **THEN** the parsed options object has `topic: "Finance"`, `count: 3`, `messenger: "discord"` with correct TypeScript types

#### Scenario: Missing required arg falls back to default
- **WHEN** `--topic` is omitted
- **THEN** the parsed options use the default topic from `process.env.NEWS_TOPIC` or a hardcoded fallback

### Requirement: Messenger functions share a typed interface
`digest.ts` SHALL define a `Messenger` type (or union) and each delivery function (`sendViaTelegram`, `sendViaDiscord`, `sendViaEmail`) SHALL conform to the signature `(content: string) => Promise<void>`.

#### Scenario: Calling any messenger uniformly
- **WHEN** the selected messenger is resolved at runtime
- **THEN** it is called with a single `string` argument and returns a `Promise<void>` with no type errors

### Requirement: Claude API response is typed
The `generateDigest` function SHALL use typed request and response shapes from `@anthropic-ai/sdk` rather than `any`.

#### Scenario: Accessing message content
- **WHEN** the Claude API returns a response
- **THEN** the content is accessed via typed SDK types with no `any` cast required

### Requirement: Web search tool fallback preserves type safety
The automatic retry without `web_search_20250305` SHALL remain type-safe with no `any` casts introduced for the retry path.

#### Scenario: Fallback retry compiles cleanly
- **WHEN** the initial request with web search fails due to tier restrictions
- **THEN** the retry request is constructed using the same typed parameters, omitting only the tool definition
