#!/usr/bin/env node
/**
 * @file digest.ts
 * @description Daily news digest generator using the Anthropic Claude API with web search.
 * Can be used as a CLI or imported as a module (exports runDigest).
 *
 * Usage (CLI):
 *   npx tsx digest.ts --topic "AI" --messenger discord
 *   npx tsx digest.ts --topic "Climate" --dry
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { createTransport } from 'nodemailer';
import { parseArgs } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

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
// Environment loading
// ---------------------------------------------------------------------------

function loadEnv(): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
// Lazy Anthropic client
// ---------------------------------------------------------------------------

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

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
// Core: generate digest
// ---------------------------------------------------------------------------

export async function generateDigest(topic: string): Promise<string> {
  console.log(`\n🔍  Searching for top "${topic}" article from the last 24 hours…`);

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Find the single most important news article about "${topic}" published on ${today} or ${yesterday()}.

Start your reply directly with the article — no preamble, no search commentary.

**[Article Title]**
Source: [Publication Name]
URL: [Article URL]
Summary: [2-3 sentences]
Why it matters: [1 sentence]
---
Generated: ${new Date().toUTCString()}
Powered by Claude`;

  let response: Anthropic.Message;
  try {
    response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    const apiErr = err as { status?: number; message?: string };
    if (apiErr.status === 400 && apiErr.message?.includes('web_search')) {
      console.warn('⚠️   Web search unavailable – falling back to knowledge-only mode.');
      response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt + '\n\nUse your most recent training knowledge. Reply in the format above only.' }],
      });
    } else {
      throw err;
    }
  }

  const textBlocks = response.content.filter((b): b is TextBlock => b.type === 'text');
  if (textBlocks.length === 0) throw new Error('Claude returned no text in its response.');

  const raw = textBlocks.map(b => b.text).join('\n');
  const articleStart = raw.indexOf('**');
  const digest = articleStart > 0 ? raw.slice(articleStart) : raw;
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

// ---------------------------------------------------------------------------
// Delivery: Email
// ---------------------------------------------------------------------------

async function sendViaEmailWithTopic(digest: string, topic: string): Promise<void> {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;
  if (!email)    throw new Error('GMAIL_EMAIL is not set in your environment.');
  if (!password) throw new Error('GMAIL_PASSWORD is not set in your environment.');

  console.log('📨  Sending via Gmail…');
  const transporter = createTransport({ service: 'gmail', auth: { user: email, pass: password } });
  const htmlContent = `
    <html><body style="font-family: sans-serif; max-width: 700px; margin: auto;">
      <h1 style="color:#1a1a2e;">📰 Daily Digest: ${escapeHtml(topic)}</h1>
      <pre style="white-space:pre-wrap; font-family:inherit; font-size:14px;">${escapeHtml(digest)}</pre>
      <hr/><p style="color:#888; font-size:12px;">Powered by Claude AI</p>
    </body></html>`;
  await transporter.sendMail({
    from: email, to: email,
    subject: `📰 Daily Digest: ${topic}`,
    text: digest, html: htmlContent,
  });
  console.log('✅  Sent via Email.');
}

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
// Public API (used by server.ts / daily.ts)
// ---------------------------------------------------------------------------

export async function sendViaEmailTo(digest: string, topic: string, recipientEmail: string): Promise<void> {
  const senderEmail = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_PASSWORD;
  if (!senderEmail) throw new Error('GMAIL_EMAIL is not set.');
  if (!password) throw new Error('GMAIL_PASSWORD is not set.');

  const serviceUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.SERVICE_URL ?? '';
  const unsubToken = Buffer.from(recipientEmail).toString('base64url');
  const unsubLink = serviceUrl ? `${serviceUrl}/unsubscribe?token=${unsubToken}` : '';

  const { createTransport: makeTransport } = await import('nodemailer');
  const transporter = makeTransport({ service: 'gmail', auth: { user: senderEmail, pass: password } });
  const htmlContent = `<html><body style="font-family:sans-serif;max-width:700px;margin:auto;padding:1rem;">
    <h1 style="color:#1a1a2e;">📰 Daily Digest: ${escapeHtml(topic)}</h1>
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;">${escapeHtml(digest)}</pre>
    <hr/><p style="color:#888;font-size:12px;">Powered by Claude AI${unsubLink ? ` &middot; <a href="${unsubLink}">Unsubscribe</a>` : ''}</p>
  </body></html>`;

  await transporter.sendMail({
    from: senderEmail,
    to: recipientEmail,
    subject: `📰 Daily Digest: ${topic}`,
    text: digest + (unsubLink ? `\n\nUnsubscribe: ${unsubLink}` : ''),
    html: htmlContent,
  });
  console.log(`✅  Email sent to ${recipientEmail}`);
}

export async function runDigest(topic: string): Promise<void> {
  const digest = await generateDigest(topic);
  await sendViaDiscordWithTopic(digest, topic);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
if (resolve(process.argv[1] ?? '') === resolve(__filename)) {
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
  --count,     -c  Number of articles            (default: 1)
  --dry,       -d  Preview only – do not send
  --smoke,     -s  Smoke test: verify API connectivity with minimal tokens
  --ping,      -p  Send a Discord ping (no API call)
  --output,    -o  Also save digest to this file
  --help,      -h  Show this help
`);
    process.exit(0);
  }

  const TOPIC     = args.topic;
  const MESSENGER = args.messenger.toLowerCase();
  const ARTICLE_COUNT = Math.max(1, Math.min(20, parseInt(args.count, 10) || 1));
  const DRY_RUN   = args.dry;
  const SMOKE     = args.smoke;
  const PING      = args.ping;
  const OUTPUT_FILE = args.output;

  const sendViaDiscord: MessengerFn = (d) => sendViaDiscordWithTopic(d, TOPIC);
  const sendViaEmail:   MessengerFn = (d) => sendViaEmailWithTopic(d, TOPIC);

  async function main(): Promise<void> {
    if (PING) {
      try {
        await sendViaDiscord('🏓 Ping from News Digest — Discord connection OK!');
        console.log('✅  Discord ping sent.');
      } catch (err) {
        console.error(`❌  Discord ping failed: ${(err as Error).message}`);
        process.exit(1);
      }
      return;
    }

    if (SMOKE) {
      try {
        console.log('🔬  Running smoke test…');
        const response = await getClient().messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Reply with OK' }],
        });
        const text = (response.content.find(b => b.type === 'text') as TextBlock | undefined)?.text ?? '';
        console.log(`✅  API reachable. Response: "${text.trim()}"`);
        if (MESSENGER === 'discord') await sendViaDiscord(`🔬 Smoke test passed. Response: "${text.trim()}"`);
        if (MESSENGER === 'email')   await sendViaEmail(`🔬 Smoke test passed. Response: "${text.trim()}"`);
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
      digest = await generateDigest(TOPIC);
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

    const messengerMap: Record<string, MessengerFn> = { discord: sendViaDiscord, email: sendViaEmail };

    try {
      const fn = messengerMap[MESSENGER];
      if (fn) {
        await fn(digest);
      } else {
        console.log('\n--- DIGEST ---\n');
        console.log(digest);
        console.log('\n--- END ---\n');
      }
    } catch (err) {
      console.error(`\n❌  Delivery failed: ${(err as Error).message}`);
      process.exit(1);
    }

    if (OUTPUT_FILE) saveToFile(digest, TOPIC, OUTPUT_FILE);
  }

  main().catch(err => {
    console.error(`\n❌  Unexpected error: ${(err as Error).message}`);
    process.exit(1);
  });
}
