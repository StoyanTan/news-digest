#!/usr/bin/env node
/**
 * @file scheduler.ts
 * @description Local task scheduler for the Daily News Digest.
 * Runs digest.ts at a configured daily time without requiring cron.
 * Useful on Windows or when cron is not available.
 *
 * Usage:
 *   npx tsx scheduler.ts
 *   npx tsx scheduler.ts --run-now   # also run immediately on start
 *
 * Configuration via environment variables (or .env file):
 *   SCHEDULE_HOUR      - Hour to run (0–23), default: 8
 *   SCHEDULE_MINUTE    - Minute to run (0–59), default: 0
 *   NEWS_TOPIC         - Topic for the digest
 *   MESSENGER          - Delivery method (telegram/discord/email/none)
 */

import { spawn, SpawnOptions } from 'child_process';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SchedulerConfig {
  hour: number;
  minute: number;
  topic: string;
  messenger: string;
  runNow: boolean;
  logFile: string;
}

interface SchedulerCliArgs {
  'run-now': boolean;
  help: boolean;
}

// ---------------------------------------------------------------------------
// Env loader
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
// CLI
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    'run-now': { type: 'boolean', default: false },
    help:      { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
}) as { values: SchedulerCliArgs };

if (args.help) {
  console.log(`
Daily News Digest – Scheduler

Usage:
  npx tsx scheduler.ts [--run-now]

Options:
  --run-now   Also run the digest immediately on start
  --help, -h  Show this help

Environment variables:
  SCHEDULE_HOUR    Hour to run (0–23), default 8
  SCHEDULE_MINUTE  Minute to run (0–59), default 0
  NEWS_TOPIC       Topic for the digest
  MESSENGER        Delivery method: telegram | discord | email | none
`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const config: SchedulerConfig = {
  hour:      parseInt(process.env.SCHEDULE_HOUR   || '8', 10),
  minute:    parseInt(process.env.SCHEDULE_MINUTE || '0', 10),
  topic:     process.env.NEWS_TOPIC  || 'Technology',
  messenger: process.env.MESSENGER   || 'none',
  runNow:    args['run-now'],
  logFile:   join(process.cwd(), 'digest-schedule.log'),
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(message: string): void {
  const ts: string = new Date().toISOString();
  const line = `[${ts}] ${message}`;
  console.log(line);
  try {
    appendFileSync(config.logFile, line + '\n', 'utf8');
  } catch (_) {
    // Non-fatal: log file write failure should not crash the scheduler.
  }
}

// ---------------------------------------------------------------------------
// Digest runner
// ---------------------------------------------------------------------------

let isRunning = false;

function runDigest(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isRunning) {
      log('⚠️   Digest already running – skipping duplicate invocation.');
      resolve();
      return;
    }

    isRunning = true;
    log(`▶   Running digest | topic="${config.topic}" | messenger="${config.messenger}"`);

    const spawnArgs: string[] = [
      '--import', 'tsx/esm',
      'digest.ts',
      '--topic', config.topic,
      '--messenger', config.messenger,
    ];

    const spawnOptions: SpawnOptions = {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    };

    const child = spawn(process.execPath, spawnArgs, spawnOptions);

    (child.stdout as NodeJS.ReadableStream).on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) log(`    ${line}`);
      }
    });

    (child.stderr as NodeJS.ReadableStream).on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line.trim()) log(`    ERR ${line}`);
      }
    });

    child.on('close', (code: number | null) => {
      isRunning = false;
      if (code === 0) {
        log('✅  Digest completed successfully.');
        resolve();
      } else {
        const err = new Error(`digest.ts exited with code ${code}`);
        log(`❌  Digest failed: ${err.message}`);
        reject(err);
      }
    });

    child.on('error', (err: Error) => {
      isRunning = false;
      log(`❌  Failed to start digest.ts: ${err.message}`);
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Scheduling loop
// ---------------------------------------------------------------------------

function msUntilNextRun(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(config.hour, config.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function formatMs(ms: number): string {
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
log('📅  Daily News Digest Scheduler started');
log(`    Topic      : ${config.topic}`);
log(`    Delivery   : ${config.messenger}`);
log(`    Runs daily : ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}`);
log(`    Log file   : ${config.logFile}`);
log('━'.repeat(50));

process.on('SIGINT',  () => { log('🛑  Scheduler stopped (SIGINT).');  process.exit(0); });
process.on('SIGTERM', () => { log('🛑  Scheduler stopped (SIGTERM).'); process.exit(0); });

if (config.runNow) {
  log('▶   --run-now flag set: executing digest immediately.');
  runDigest().catch(() => {});
}

function tick(): void {
  const now = new Date();
  if (now.getHours() === config.hour && now.getMinutes() === config.minute) {
    runDigest().catch(() => {});
  }
}

setInterval(tick, 60 * 1000);

const ms = msUntilNextRun();
log(`⏰  Next run in ${formatMs(ms)} (at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} tomorrow if past).`);
log('    Press Ctrl+C to stop.\n');
