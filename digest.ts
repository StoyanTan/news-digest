#!/usr/bin/env node
/**
 * @file digest.ts
 * @description Daily news digest generator using the Anthropic Claude API with web search.
 * Supports delivery via Discord, Email, or local file output.
 *
 * Usage:
 *   npx tsx digest.ts --topic "AI" --messenger discord
 *   npx tsx digest.ts --topic "Climate" --count 3 --dry
 *   npx tsx digest.ts --topic "Finance" --messenger email --output digest.md
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { createTransport } from 'nodemailer';
import { parseArgs } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CliOptions {
  topic: string;
  messenger: string;
  count: string;
  dry: boolean;
  smoke: boolean;
  ping: boolean;
  output: string;
  help: boolean;
}

type MessengerFn = (content: string) => Promise<void>;

// ---------------------------------------------------------------------------
// Environment loading (manual dotenv-lite – no extra dependency)
// ---------------------------------------------------------------------------

function loadEnv(): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    topic:     { type: 'string',  short: 't', default: process.env.NEWS_TOPIC || 'Technology' },
    messenger: { type: 'string',  short: 'm', default: 'none' },
    count:     { type: 'string',  short: 'c', default: String(process.env.ARTICLE_COUNT || '1') },
    dry:       { type: 'boolean', short: 'd', default: false },
    smoke:     { type: 'boolean', short: 's', default: false },
    ping:      { type: 'boolean', short: 'p', default: false },
    output:    { type: 'string',  short: 'o', default: '' },
    help:      { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
}) as { values: CliOptions };

if (args.help) {
  console.log(`
Daily News Digest – powered by Claude AI

Usage:
  npx tsx digest.ts [options]

Options:
  --topic,     -t  Topic to search for           (default: "Technology")
  --messenger, -m  Delivery method: discord, email, none
  --count,     -c  Number of articles            (default: 5)
  --dry,       -d  Preview only – do not send
  --smoke,     -s  Smoke test: verify API connectivity with minimal tokens
  --output,    -o  Also save digest to this file
  --help,      -h  Show this help

Examples:
  npx tsx digest.ts --topic "AI" --messenger discord
  npx tsx digest.ts --topic "Climate" --dry
  npx tsx digest.ts --topic "Finance" --count 3 --output finance.md
`);
  process.exit(0);
}

const TOPIC = args.topic;
const MESSENGER = args.messenger.toLowerCase();
const ARTICLE_COUNT = Math.max(1, Math.min(20, parseInt(args.count, 10) || 5));
const DRY_RUN = args.dry;
const SMOKE = args.smoke;
const PING = args.ping;
const OUTPUT_FILE = args.output;

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY environment variable is not set.');
  console.error('    Set it in your .env file or export it before running.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Core: generate digest
// ---------------------------------------------------------------------------

async function generateDigest(topic: string, articleCount: number): Promise<string> {
  console.log(`\n🔍  Searching for ${articleCount} recent articles on "${topic}"…`);

  const prompt = `Find the single most important recent news article about "${topic}" published in the last 7 days.

Provide:
- Title
- Source (publication name)
- URL
- Summary (3–4 sentences)
- Why it matters (1–2 sentences)

Format exactly like this:

**[Article Title]**
Source: [Publication Name]
URL: [Article URL]
Summary: [3-4 sentence summary]
Why it matters: [1-2 sentences]
---
Generated: [current date and time with timezone]
Powered by Claude`;

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    const apiErr = err as { status?: number; message?: string };
    if (apiErr.status === 400 && apiErr.message?.includes('web_search')) {
      console.warn('⚠️   Web search tool unavailable for this API key tier – falling back to knowledge-only mode.');
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt + '\n\nNote: Use your training knowledge to provide the best article you are aware of.' }],
      });
    } else {
      throw err;
    }
  }

  const textBlocks = response.content.filter((b): b is TextBlock => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('Claude returned no text in its response.');
  }

  const digest = textBlocks.map(b => b.text).join('\n');
  console.log('✅  Digest generated successfully.');
  return digest;
}

// ---------------------------------------------------------------------------
// Delivery: Discord
// ---------------------------------------------------------------------------

async function sendViaDiscordWithTopic(digest: string, topic: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is not set in your environment.');

  const MAX_EMBED_DESC = 4096;
  const chunks = chunkText(digest, MAX_EMBED_DESC);

  console.log(`📨  Sending ${chunks.length} embed(s) via Discord…`);

  for (let i = 0; i < chunks.length; i++) {
    const embed = {
      title: i === 0 ? `📰 Daily Digest: ${topic}` : `📰 Daily Digest: ${topic} (continued)`,
      description: chunks[i],
      color: 0x5865F2,
      footer: { text: 'Powered by Claude AI' },
    };

    const res = await fetchWithRetry(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord webhook error ${res.status}: ${errText}`);
    }
  }

  console.log('✅  Sent via Discord.');
}

const sendViaDiscord: MessengerFn = (digest) => sendViaDiscordWithTopic(digest, TOPIC);

// ---------------------------------------------------------------------------
// Delivery: Email
// ---------------------------------------------------------------------------

async function sendViaEmailWithTopic(digest: string, topic: string): Promise<void> {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;

  if (!email)    throw new Error('GMAIL_EMAIL is not set in your environment.');
  if (!password) throw new Error('GMAIL_PASSWORD is not set in your environment.');

  console.log('📨  Sending via Gmail…');

  const transporter = createTransport({
    service: 'gmail',
    auth: { user: email, pass: password },
  });

  const htmlContent = `
    <html><body style="font-family: sans-serif; max-width: 700px; margin: auto;">
      <h1 style="color:#1a1a2e;">📰 Daily Digest: ${escapeHtml(topic)}</h1>
      <pre style="white-space:pre-wrap; font-family:inherit; font-size:14px;">${escapeHtml(digest)}</pre>
      <hr/>
      <p style="color:#888; font-size:12px;">Powered by Claude AI</p>
    </body></html>
  `;

  await transporter.sendMail({
    from: email,
    to: email,
    subject: `📰 Daily Digest: ${topic}`,
    text: digest,
    html: htmlContent,
  });

  console.log('✅  Sent via Email.');
}

const sendViaEmail: MessengerFn = (digest) => sendViaEmailWithTopic(digest, TOPIC);

// ---------------------------------------------------------------------------
// Delivery: File
// ---------------------------------------------------------------------------

function saveToFile(digest: string, topic: string, filePath: string): void {
  const safeTopic = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  const target = filePath || `digest-${safeTopic}-${dateStr}.md`;
  writeFileSync(target, `# Daily Digest: ${topic}\n\n${digest}\n`, 'utf8');
  console.log(`💾  Saved to ${target}`);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt === -1) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = 1000 * 2 ** (attempt - 1);
      console.warn(`⚠️   Network error (attempt ${attempt}/${retries}), retrying in ${delay}ms…`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('fetchWithRetry: exhausted retries');
}

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------

async function runSmokeTest(messenger: string): Promise<void> {
  console.log('🔬  Running smoke test…');
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Reply with OK' }],
  });
  const text = (response.content.find(b => b.type === 'text') as TextBlock | undefined)?.text ?? '';
  console.log(`✅  API reachable. Response: "${text.trim()}"`);

  if (messenger === 'discord') {
    await sendViaDiscord(`🔬 Smoke test passed: Claude API reachable. Response: "${text.trim()}"`);
  } else if (messenger === 'email') {
    await sendViaEmail(`🔬 Smoke test passed: Claude API reachable. Response: "${text.trim()}"`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (PING) {
    try {
      await sendViaDiscord('🏓 Ping from News Digest — Discord connection OK!');
      console.log('✅  Discord ping sent.');
    } catch (err) {
      const e = err as { message: string };
      console.error(`❌  Discord ping failed: ${e.message}`);
      process.exit(1);
    }
    return;
  }

  if (SMOKE) {
    try {
      await runSmokeTest(MESSENGER);
    } catch (err) {
      const e = err as { message: string; status?: number };
      console.error(`\n❌  Smoke test failed: ${e.message}`);
      if (e.status) console.error(`    HTTP ${e.status}`);
      process.exit(1);
    }
    return;
  }

  console.log('━'.repeat(50));
  console.log(`📰  Daily News Digest`);
  console.log(`    Topic    : ${TOPIC}`);
  console.log(`    Articles : ${ARTICLE_COUNT}`);
  console.log(`    Delivery : ${DRY_RUN ? 'dry-run (preview only)' : MESSENGER}`);
  console.log('━'.repeat(50));

  let digest: string;
  try {
    digest = await generateDigest(TOPIC, ARTICLE_COUNT);
  } catch (err) {
    const e = err as { message: string; status?: number };
    console.error(`\n❌  Failed to generate digest: ${e.message}`);
    if (e.status) console.error(`    HTTP ${e.status}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n--- DIGEST PREVIEW ---\n');
    console.log(digest);
    console.log('\n--- END PREVIEW ---\n');
    console.log('ℹ️   Dry-run mode: digest was not sent.');
    if (OUTPUT_FILE) saveToFile(digest, TOPIC, OUTPUT_FILE);
    return;
  }

  const messengerMap: Record<string, MessengerFn> = {
    discord: sendViaDiscord,
    email:   sendViaEmail,
  };

  try {
    const fn = messengerMap[MESSENGER];
    if (fn) {
      await fn(digest);
    } else if (MESSENGER === 'none') {
      console.log('\n--- DIGEST ---\n');
      console.log(digest);
      console.log('\n--- END ---\n');
    } else {
      console.warn(`⚠️   Unknown messenger "${MESSENGER}". Printing to console.`);
      console.log(digest);
    }
  } catch (err) {
    const e = err as { message: string };
    console.error(`\n❌  Delivery failed: ${e.message}`);
    process.exit(1);
  }

  if (OUTPUT_FILE) saveToFile(digest, TOPIC, OUTPUT_FILE);
}

main().catch(err => {
  const e = err as { message: string };
  console.error(`\n❌  Unexpected error: ${e.message}`);
  process.exit(1);
});
