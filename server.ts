import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env so DISCORD_WEBHOOK_URL is available without relying on the child process
const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', async (req, res) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    res.status(500).json({ ok: false, error: 'DISCORD_WEBHOOK_URL not set' });
    return;
  }
  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '🏓 Ping from News Digest — Discord connection OK!' }),
    });
    if (!r.ok) throw new Error(`Discord returned ${r.status}`);
    res.json({ ok: true });
  } catch (err) {
    const e = err as { message: string };
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/run', (req, res) => {
  const topic = (req.query.topic as string) || 'Technology';

  res.setTimeout(0);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const child = spawn('npx', ['tsx', 'digest.ts', '--topic', topic, '--ping'], {
    cwd: __dirname,
    shell: true,
  });

  const sendLine = (line: string) => {
    res.write(`data: ${line}\n\n`);
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let stdoutBuf = '';
  child.stdout.on('data', (chunk: string) => {
    stdoutBuf += chunk;
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() ?? '';
    for (const line of lines) sendLine(line);
  });

  let stderrBuf = '';
  child.stderr.on('data', (chunk: string) => {
    stderrBuf += chunk;
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop() ?? '';
    for (const line of lines) sendLine(line);
  });

  child.on('close', (code) => {
    if (stdoutBuf) sendLine(stdoutBuf);
    if (stderrBuf) sendLine(stderrBuf);
    if (code === 0 || code === null) {
      res.write('event: done\ndata: \n\n');
    } else {
      res.write(`event: error\ndata: Process exited with code ${code}\n\n`);
    }
    res.end();
  });

  req.on('close', () => child.kill());
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
