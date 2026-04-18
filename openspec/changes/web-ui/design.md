## Context

The app currently runs entirely from the CLI. `digest.ts` is a self-contained script that writes to stdout. The goal is to wrap it with a minimal web layer — an Express server that spawns `digest.ts` as a child process and streams its output to the browser over Server-Sent Events (SSE).

## Goals / Non-Goals

**Goals:**
- Single HTML page with topic input and a trigger button
- Real-time output streaming (user sees progress as digest generates)
- No authentication — open access for now
- Deployable to Railway/Render/Fly.io with minimal changes

**Non-Goals:**
- User accounts or history
- Multiple simultaneous runs (no queue — concurrent requests each spawn their own process)
- Mobile-optimised design
- Build step — stays `npx tsx server.ts`

## Decisions

**SSE over WebSockets for streaming**
SSE is unidirectional (server → browser), which is all we need. It works over plain HTTP, requires no extra library on the client, and is natively supported by all modern browsers. WebSockets add handshake complexity with no benefit here.

**Child process over in-process import**
`digest.ts` is a CLI script that calls `process.exit()`. Spawning it as a child process via `spawn('npx', ['tsx', 'digest.ts', ...])` keeps clean isolation — each run gets its own process, stdout/stderr pipe naturally into the SSE stream, and a crash cannot take down the server.

**Single `public/index.html` — no frontend framework**
The UI is one input, one button, and a scrolling output panel. Vanilla HTML/CSS/JS is sufficient and keeps zero build dependencies.

**Express over Node built-in `http`**
Express adds ~2 lines of routing clarity and is already a familiar dependency in Node projects. It also makes adding future routes (e.g., `/history`, `/status`) trivial.

## Risks / Trade-offs

[Long-running requests] SSE connections stay open for 20-60s per digest run. On free-tier hosts (Railway, Render) with request timeouts, very long runs may be cut off. → Mitigation: set `res.setTimeout(0)` and document the limitation. Later can add a job queue.

[No concurrency limit] Every button click spawns a new child process. Under load this burns Anthropic credits fast. → Mitigation: acceptable for now (shared with trusted people). A simple in-flight counter can be added later.

[`process.exit()` in digest.ts] The child process exits cleanly after each run, so this is not a problem with the spawn approach — but if digest.ts is ever refactored to be imported directly, this will need addressing.

## Migration Plan

1. Add `express` and `@types/express` to dependencies
2. Create `server.ts` and `public/index.html`
3. Add `"serve": "npx tsx server.ts"` to `package.json` scripts
4. Test locally, then deploy to Railway/Render

No rollback needed — additive change only, existing CLI unaffected.

## Open Questions

- Default port: `3000` (standard for local dev, overridable via `PORT` env var for deployment)
- Should the topic field have a default value? → Yes, pre-fill with `"Technology"` matching the CLI default
