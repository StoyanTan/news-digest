#!/usr/bin/env node
/**
 * @file scheduler.js
 * @description Local task scheduler for the Daily News Digest.
 * Runs digest.js at a configured daily time without requiring cron.
 * Useful on Windows or when cron is not available.
 *
 * Usage:
 *   node scheduler.js
 *   node scheduler.js --run-now   # also run immediately on start
 *
 * Configuration via environment variables (or .env file):
 *   SCHEDULE_HOUR      - Hour to run (0–23), default: 8
 *   SCHEDULE_MINUTE    - Minute to run (0–59), default: 0
 *   NEWS_TOPIC         - Topic for the digest
 *   MESSENGER          - Delivery method (telegram/discord/email/none)
 */

import { spawn } from 'child_process';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';

// ---------------------------------------------------------------------------
// Env loader
// ---------------------------------------------------------------------------

function loadEnv() {
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
// Config
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    'run-now': { type: 'boolean', default: false },
    help:      { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Daily News Digest – Scheduler

Usage:
  node scheduler.js [--run-now]

Options:
  --run-now   Also run the digest immediately on start
  --help      Show this help

Environment variables:
  SCHEDULE_HOUR    Hour to run (0–23), default 8
  SCHEDULE_MINUTE  Minute to run (0–59), default 0
  NEWS_TOPIC       Topic for the digest
  MESSENGER        Delivery method: telegram | discord | email | none
`);
  process.exit(0);
}

const SCHEDULE_HOUR   = parseInt(process.env.SCHEDULE_HOUR   || '8',  10);
const SCHEDULE_MINUTE = parseInt(process.env.SCHEDULE_MINUTE || '0',  10);
const TOPIC           = process.env.NEWS_TOPIC   || 'Technology';
const MESSENGER       = process.env.MESSENGER    || 'none';
const LOG_FILE        = join(process.cwd(), 'digest-schedule.log');

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

/**
 * Writes a timestamped message to both the console and the log file.
 *
 * @param {string} message - The message to log.
 */
function log(message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + '\n', 'utf8');
  } catch (_) {
    // Non-fatal: log file write failure should not crash the scheduler.
  }
}

// ---------------------------------------------------------------------------
// Digest runner
// ---------------------------------------------------------------------------

let isRunning = false;

/**
 * Spawns digest.js as a child process and logs its output.
 *
 * @returns {Promise<void>} Resolves when the digest process exits.
 */
function runDigest() {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      log('⚠️   Digest already running – skipping duplicate invocation.');
      resolve();
      return;
    }

    isRunning = true;
    log(`▶   Running digest | topic="${TOPIC}" | messenger="${MESSENGER}"`);

    const child = spawn(
      process.execPath,
      ['digest.js', '--topic', TOPIC, '--messenger', MESSENGER],
      { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    child.stdout.on('data', data => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) log(`    ${line}`);
      }
    });

    child.stderr.on('data', data => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) log(`    ERR ${line}`);
      }
    });

    child.on('close', code => {
      isRunning = false;
      if (code === 0) {
        log(`✅  Digest completed successfully.`);
        resolve();
      } else {
        const err = new Error(`digest.js exited with code ${code}`);
        log(`❌  Digest failed: ${err.message}`);
        reject(err);
      }
    });

    child.on('error', err => {
      isRunning = false;
      log(`❌  Failed to start digest.js: ${err.message}`);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Scheduling loop
// ---------------------------------------------------------------------------

/**
 * Returns the number of milliseconds until the next scheduled run.
 *
 * @returns {number}
 */
function msUntilNextRun() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * Formats milliseconds into a human-readable string like "7h 42m".
 *
 * @param {number} ms - Milliseconds.
 * @returns {string}
 */
function formatMs(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

log('━'.repeat(50));
log(`📅  Daily News Digest Scheduler started`);
log(`    Topic      : ${TOPIC}`);
log(`    Delivery   : ${MESSENGER}`);
log(`    Runs daily : ${String(SCHEDULE_HOUR).padStart(2, '0')}:${String(SCHEDULE_MINUTE).padStart(2, '0')}`);
log(`    Log file   : ${LOG_FILE}`);
log('━'.repeat(50));

// Graceful shutdown
process.on('SIGINT',  () => { log('🛑  Scheduler stopped (SIGINT).');  process.exit(0); });
process.on('SIGTERM', () => { log('🛑  Scheduler stopped (SIGTERM).'); process.exit(0); });

// Optional immediate run
if (args['run-now']) {
  log('▶   --run-now flag set: executing digest immediately.');
  runDigest().catch(() => {});
}

// Check every minute whether it is time to run
function tick() {
  const now = new Date();
  if (now.getHours() === SCHEDULE_HOUR && now.getMinutes() === SCHEDULE_MINUTE) {
    runDigest().catch(() => {});
  }
}

setInterval(tick, 60 * 1000);

// Log next scheduled time
const ms = msUntilNextRun();
log(`⏰  Next run in ${formatMs(ms)} (at ${String(SCHEDULE_HOUR).padStart(2,'0')}:${String(SCHEDULE_MINUTE).padStart(2,'0')} tomorrow if past).`);
log('    Press Ctrl+C to stop.\n');
