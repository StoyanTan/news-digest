## 1. Dependencies

- [x] 1.1 Add `express` to dependencies in `package.json`
- [x] 1.2 Add `@types/express` to devDependencies in `package.json`
- [x] 1.3 Run `npm install`

## 2. Server

- [x] 2.1 Create `server.ts` — Express app that serves `public/index.html` at `/`
- [x] 2.2 Add `GET /run` endpoint that reads `topic` query param (default `"Technology"`)
- [x] 2.3 Set SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`)
- [x] 2.4 Spawn `npx tsx digest.ts --topic "<topic>"` as a child process
- [x] 2.5 Pipe child process stdout/stderr lines as `data: <line>\n\n` SSE events
- [x] 2.6 Send `event: done\n\n` on clean exit, `event: error\n\n` on non-zero exit code
- [x] 2.7 Set `res.setTimeout(0)` to prevent request timeout during long runs

## 3. UI

- [x] 3.1 Create `public/` directory
- [x] 3.2 Create `public/index.html` with topic input pre-filled with `"Technology"`
- [x] 3.3 Add "Generate Digest" button
- [x] 3.4 Add scrolling output panel (`<pre>` or `<div>` with monospace font)
- [x] 3.5 On button click: clear output panel, disable button, open `EventSource` to `/run?topic=<value>`
- [x] 3.6 Append each incoming `data:` event line to the output panel and auto-scroll
- [x] 3.7 On `done` or `error` event: re-enable button, close `EventSource`

## 4. Package & Verify

- [x] 4.1 Add `"serve": "npx tsx server.ts"` to `package.json` scripts
- [x] 4.2 Run `npm run build` — zero type errors
- [x] 4.3 Run `npm run serve`, open `localhost:3000`, trigger a digest run end-to-end
