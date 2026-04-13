# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Node.js application that generates daily news digests using the Anthropic Claude API
(with web search) and delivers them via Telegram, Discord, or Email.

## Tech Stack

- **Runtime**: Node.js ≥ 18, ES modules (`"type": "module"`)
- **AI**: `@anthropic-ai/sdk` with `claude-opus-4-6` and `web_search_20250305` tool
- **Email**: `nodemailer` (Gmail)
- **No build step** — run directly with `node`

## Key Files

```
digest.js      # Main app: CLI args, API call, messenger delivery
setup.js       # Interactive wizard that writes .env
scheduler.js   # Cross-platform daily scheduler (alternative to cron)
package.json   # Dependencies and npm scripts
.env           # Credentials (git-ignored — copy from .env.example)
```

## Development

```bash
npm install
npm run setup     # configure credentials
npm test          # dry-run on "Artificial Intelligence"
node digest.js --topic "AI" --dry   # preview any topic
node digest.js --topic "Finance" --count 3 --messenger telegram
```

## Architecture

`digest.js` flow: parse CLI args → `generateDigest()` calls Claude with `web_search` tool → delivery function (`sendViaTelegram` / `sendViaDiscord` / `sendViaEmail`) → optional `saveToFile()`.

If the `web_search_20250305` tool is unavailable (API key tier), `generateDigest()` automatically retries without it (knowledge-only fallback).

`scheduler.js` spawns `digest.js` as a child process on a daily timer (checks every minute). Logs to `digest-schedule.log` in the working directory.

## Environment Variables

All credentials live in `.env`. See `.env.example` for the full list.
Required: `ANTHROPIC_API_KEY`. Then one of: `TELEGRAM_*`, `DISCORD_WEBHOOK_URL`, or `GMAIL_*`.

Scheduler-specific (optional):
- `SCHEDULE_HOUR` / `SCHEDULE_MINUTE` — time to run daily (default `8:00`)
- `MESSENGER` — delivery method used by scheduler
- `NEWS_TOPIC` / `ARTICLE_COUNT` — default topic and article count

```bash
node scheduler.js           # start scheduled runner
node scheduler.js --run-now # also fire immediately on start
```
