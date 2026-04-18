/**
 * Integration test: /ping endpoint → Discord
 * Starts the server, calls GET /ping, verifies Discord receives the message.
 * No Anthropic API calls.
 * Run: npx tsx test/discord-ping.ts
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PORT = 3001; // use a separate port to avoid clashing with a running dev server

function startServer(): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['tsx', 'server.ts'], {
      cwd: root,
      shell: true,
      env: { ...process.env, PORT: String(PORT) },
    });

    const kill = () => server.kill();

    server.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('Server running')) resolve(kill);
    });

    server.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    server.on('error', reject);

    setTimeout(() => reject(new Error('Server did not start within 10s')), 10_000);
  });
}

function pass(msg: string) { console.log(`PASS  ${msg}`); }
function fail(msg: string) { console.error(`FAIL  ${msg}`); process.exit(1); }

async function run(): Promise<void> {
  console.log('Starting server…');
  const kill = await startServer();
  pass(`Server listening on port ${PORT}`);

  try {
    // 1. /ping endpoint responds
    let res: Response;
    try {
      res = await fetch(`http://localhost:${PORT}/ping`);
    } catch (err) {
      const e = err as { message: string };
      fail(`Could not reach /ping: ${e.message}`);
      return;
    }

    if (res.status !== 200) fail(`/ping returned HTTP ${res.status}, expected 200`);
    pass(`/ping returned HTTP ${res.status}`);

    // 2. Response body is { ok: true }
    const body = await res.json() as { ok: boolean; error?: string };
    if (!body.ok) fail(`/ping responded { ok: false, error: "${body.error}" }`);
    pass(`/ping responded { ok: true } — message delivered to Discord`);

  } finally {
    kill();
  }

  console.log('\nAll checks passed.');
}

run().catch(err => {
  console.error(`FAIL  Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
