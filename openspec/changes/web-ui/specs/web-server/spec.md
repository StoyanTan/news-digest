## ADDED Requirements

### Requirement: Server starts and serves the UI
The server SHALL start on a configurable port (default `3000`, overridable via `PORT` env var) and serve `public/index.html` at the root path `/`.

#### Scenario: Default port
- **WHEN** `server.ts` is run without a `PORT` env var
- **THEN** the server listens on port `3000`

#### Scenario: Custom port
- **WHEN** `PORT=8080` is set in the environment
- **THEN** the server listens on port `8080`

#### Scenario: UI served at root
- **WHEN** a browser requests `GET /`
- **THEN** the server responds with `public/index.html` and status `200`

### Requirement: Discord ping endpoint
The server SHALL expose `GET /ping` that posts a hardcoded test message to the configured Discord webhook and returns a JSON result. No Anthropic API call is made.

#### Scenario: Successful ping
- **WHEN** `DISCORD_WEBHOOK_URL` is set and reachable
- **THEN** the server POSTs a test message to Discord and responds `{ "ok": true }` with status `200`

#### Scenario: Missing webhook URL
- **WHEN** `DISCORD_WEBHOOK_URL` is not set
- **THEN** the server responds `{ "ok": false, "error": "DISCORD_WEBHOOK_URL not set" }` with status `500`

#### Scenario: Discord unreachable
- **WHEN** Discord returns a non-2xx status or the request fails
- **THEN** the server responds `{ "ok": false, "error": "<reason>" }` with status `500`

### Requirement: Digest run endpoint with SSE streaming
The server SHALL expose `GET /run?topic=<topic>` that spawns `digest.ts` as a child process and streams its stdout/stderr output to the client using Server-Sent Events.

#### Scenario: Valid topic triggers digest
- **WHEN** a client requests `GET /run?topic=Artificial+Intelligence`
- **THEN** the server spawns `npx tsx digest.ts --topic "Artificial Intelligence"` and streams output lines as SSE `data:` events

#### Scenario: Stream ends on process exit
- **WHEN** the child process exits
- **THEN** the server sends a final `event: done` SSE event and closes the response

#### Scenario: Missing topic falls back to default
- **WHEN** a client requests `GET /run` with no topic parameter
- **THEN** the server uses `"Technology"` as the default topic

#### Scenario: Child process error is surfaced
- **WHEN** the child process exits with a non-zero code
- **THEN** the server sends an `event: error` SSE event with the exit code before closing
