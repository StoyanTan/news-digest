#!/usr/bin/env node
/**
 * @file digest.js
 * @description Daily news digest generator using the Anthropic Claude API with web search.
 * Supports delivery via Telegram, Discord, Email, or local file output.
 *
 * Usage:
 *   node digest.js --topic "AI" --messenger telegram
 *   node digest.js --topic "Climate" --count 3 --dry
 *   node digest.js --topic "Finance" --messenger email --output digest.md
 */

import Anthropic from '@anthropic-ai/sdk';
import { createTransport } from 'nodemailer';
import { parseArgs } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Environment loading (manual dotenv-lite – no extra dependency)
// ---------------------------------------------------------------------------

/**
 * Loads key=value pairs from a .env file in the current working directory.
 * Lines starting with # and blank lines are ignored.
 */
function loadEnv() {
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
    count:     { type: 'string',  short: 'c', default: String(process.env.ARTICLE_COUNT || '5') },
    dry:       { type: 'boolean', short: 'd', default: false },
    output:    { type: 'string',  short: 'o', default: '' },
    help:      { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Daily News Digest – powered by Claude AI

Usage:
  node digest.js [options]

Options:
  --topic,     -t  Topic to search for           (default: "Technology")
  --messenger, -m  Delivery method: telegram, discord, email, none
  --count,     -c  Number of articles            (default: 5)
  --dry,       -d  Preview only – do not send
  --output,    -o  Also save digest to this file
  --help,      -h  Show this help

Examples:
  node digest.js --topic "AI" --messenger telegram
  node digest.js --topic "Climate" --dry
  node digest.js --topic "Finance" --count 3 --output finance.md
`);
  process.exit(0);
}

const TOPIC = args.topic;
const MESSENGER = args.messenger.toLowerCase();
const ARTICLE_COUNT = Math.max(1, Math.min(20, parseInt(args.count, 10) || 5));
const DRY_RUN = args.dry;
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

/**
 * Generates a news digest for the given topic using Claude with web search.
 *
 * @param {string} topic - The news topic to search for.
 * @param {number} articleCount - How many articles to include.
 * @returns {Promise<string>} The formatted digest as plain text.
 */
async function generateDigest(topic, articleCount) {
  console.log(`\n🔍  Searching for ${articleCount} recent articles on "${topic}"…`);

  const prompt = `Find ${articleCount} recent, non-paywalled news articles about "${topic}" published in the last 7 days.

For each article provide:
- Title
- Source (publication name)
- URL
- Summary (2–3 sentences)
- Relevance (1 sentence explaining why this matters)

Format each article exactly like this:

**[Article Title]**
Source: [Publication Name]
URL: [Article URL]
Summary: [2-3 sentence summary]
Relevance: [Why this matters]
---

After all articles add:
Generated: [current date and time with timezone]
Powered by Claude`;

  let response;
  try {
    response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (err) {
    if (err.status === 400 && err.message?.includes('web_search')) {
      console.warn('⚠️   Web search tool unavailable for this API key tier – falling back to knowledge-only mode.');
      response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt + '\n\nNote: Use your training knowledge to provide the best articles you are aware of.' }],
      });
    } else {
      throw err;
    }
  }

  // Extract text content from response (may contain tool_use blocks too)
  const textBlocks = response.content.filter(b => b.type === 'text');
  if (textBlocks.length === 0) {
    throw new Error('Claude returned no text in its response.');
  }

  const digest = textBlocks.map(b => b.text).join('\n');
  console.log('✅  Digest generated successfully.');
  return digest;
}

// ---------------------------------------------------------------------------
// Delivery: Telegram
// ---------------------------------------------------------------------------

/**
 * Sends a digest via Telegram Bot API, chunking messages longer than 4096 chars.
 *
 * @param {string} digest - The digest text to send.
 * @returns {Promise<void>}
 */
async function sendViaTelegram(digest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in your environment.');
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID is not set in your environment.');

  const MAX_LEN = 4096;
  const chunks = chunkText(digest, MAX_LEN);

  console.log(`📨  Sending ${chunks.length} message(s) via Telegram…`);

  for (const chunk of chunks) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: 'Markdown' });

    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram API error ${res.status}: ${err}`);
    }
  }

  console.log('✅  Sent via Telegram.');
}

// ---------------------------------------------------------------------------
// Delivery: Discord
// ---------------------------------------------------------------------------

/**
 * Sends a digest via Discord webhook, splitting into embeds for messages >2000 chars.
 *
 * @param {string} digest - The digest text to send.
 * @param {string} topic  - The topic name, used as the embed title.
 * @returns {Promise<void>}
 */
async function sendViaDiscord(digest, topic) {
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
      const err = await res.text();
      throw new Error(`Discord webhook error ${res.status}: ${err}`);
    }
  }

  console.log('✅  Sent via Discord.');
}

// ---------------------------------------------------------------------------
// Delivery: Email
// ---------------------------------------------------------------------------

/**
 * Sends the digest via Gmail using nodemailer.
 *
 * @param {string} digest - The digest text to send.
 * @param {string} topic  - Topic used as the email subject.
 * @returns {Promise<void>}
 */
async function sendViaEmail(digest, topic) {
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

// ---------------------------------------------------------------------------
// Delivery: File
// ---------------------------------------------------------------------------

/**
 * Saves the digest to a markdown file.
 *
 * @param {string} digest   - The digest text.
 * @param {string} topic    - Topic name, used in the filename if path not provided.
 * @param {string} [filePath] - Optional explicit file path.
 * @returns {void}
 */
function saveToFile(digest, topic, filePath) {
  const safeTopic = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  const target = filePath || `digest-${safeTopic}-${dateStr}.md`;
  writeFileSync(target, `# Daily Digest: ${topic}\n\n${digest}\n`, 'utf8');
  console.log(`💾  Saved to ${target}`);
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Splits text into chunks no longer than maxLen characters, preferring newline breaks.
 *
 * @param {string} text   - The text to split.
 * @param {number} maxLen - Maximum chunk length.
 * @returns {string[]}
 */
function chunkText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
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

/**
 * Escapes HTML special characters.
 *
 * @param {string} str - Raw string.
 * @returns {string}
 */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * fetch() wrapper with simple exponential-backoff retry on transient errors.
 *
 * @param {string} url     - Target URL.
 * @param {object} options - fetch options.
 * @param {number} [retries=3] - Max retry attempts.
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, retries = 3) {
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
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('━'.repeat(50));
  console.log(`📰  Daily News Digest`);
  console.log(`    Topic    : ${TOPIC}`);
  console.log(`    Articles : ${ARTICLE_COUNT}`);
  console.log(`    Delivery : ${DRY_RUN ? 'dry-run (preview only)' : MESSENGER}`);
  console.log('━'.repeat(50));

  let digest;
  try {
    digest = await generateDigest(TOPIC, ARTICLE_COUNT);
  } catch (err) {
    console.error(`\n❌  Failed to generate digest: ${err.message}`);
    if (err.status) console.error(`    HTTP ${err.status}`);
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

  try {
    switch (MESSENGER) {
      case 'telegram':
        await sendViaTelegram(digest);
        break;
      case 'discord':
        await sendViaDiscord(digest, TOPIC);
        break;
      case 'email':
        await sendViaEmail(digest, TOPIC);
        break;
      case 'none':
        console.log('\n--- DIGEST ---\n');
        console.log(digest);
        console.log('\n--- END ---\n');
        break;
      default:
        console.warn(`⚠️   Unknown messenger "${MESSENGER}". Printing to console.`);
        console.log(digest);
    }
  } catch (err) {
    console.error(`\n❌  Delivery failed: ${err.message}`);
    process.exit(1);
  }

  if (OUTPUT_FILE) saveToFile(digest, TOPIC, OUTPUT_FILE);
}

main().catch(err => {
  console.error(`\n❌  Unexpected error: ${err.message}`);
  process.exit(1);
});
