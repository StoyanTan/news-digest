import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { runDigest } from './digest.js';
import { subscribe, unsubscribe } from './subscribers.js';
import { runDailyDigests } from './daily.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());
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
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get('/run', (req, res) => {
  const topic = (req.query.topic as string) || 'Technology';
  runDigest(topic).catch(err => {
    console.error(`❌  Digest failed for topic "${topic}": ${(err as Error).message}`);
  });
  res.status(202).json({ ok: true });
});

app.post('/subscribe', async (req, res) => {
  const { email, topics } = req.body as { email?: string; topics?: unknown[] };
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ ok: false, error: 'Valid email required.' });
    return;
  }
  if (!Array.isArray(topics) || topics.length === 0) {
    res.status(400).json({ ok: false, error: 'Select at least one topic.' });
    return;
  }
  try {
    await subscribe(email.toLowerCase().trim(), topics.map(String).slice(0, 20));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

app.get('/unsubscribe', async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) { res.status(400).send('Invalid link.'); return; }
  try {
    const email = Buffer.from(token, 'base64url').toString('utf8');
    await unsubscribe(email);
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:3rem;">
      <h2>Unsubscribed</h2><p>You have been removed from the daily digest.</p>
    </body></html>`);
  } catch {
    res.status(400).send('Invalid or expired link.');
  }
});

app.post('/daily', (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    res.status(401).json({ ok: false, error: 'Unauthorized.' });
    return;
  }
  runDailyDigests()
    .then(r => console.log(`Daily digest complete: ${JSON.stringify(r)}`))
    .catch(err => console.error(`Daily digest error: ${(err as Error).message}`));
  res.status(202).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
