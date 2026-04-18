## Why

The digest app is CLI-only, making it inaccessible to non-technical users and difficult to share. A minimal web UI lets anyone trigger a digest and choose a topic with a single click, without touching a terminal.

## What Changes

- New `server.ts` — Express server that serves the UI and exposes a `/run` endpoint
- New `public/index.html` — single-page UI with topic input, a button, and a live output panel
- Digest output streamed back to the browser in real time as it is generated
- `npm run serve` script added to `package.json`

## Capabilities

### New Capabilities
- `web-server`: Express HTTP server that serves the UI and proxies digest runs
- `digest-ui`: Browser UI with topic input, trigger button, and streaming output display

### Modified Capabilities
<!-- none -->

## Impact

- New dependency: `express` + `@types/express`
- New files: `server.ts`, `public/index.html`
- `digest.ts` unchanged — server spawns it as a child process
- No changes to existing CLI behaviour
