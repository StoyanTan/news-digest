# Daily News Digest

A production-ready Node.js application that searches for recent news articles using
the **Claude AI** web search tool, summarises them, and delivers a daily digest via
**Telegram**, **Discord**, or **Email**.

---

## Features

- AI-generated summaries with source links via Claude's web search
- Delivery via Telegram, Discord (embeds), or Gmail
- Interactive setup wizard (`npm run setup`)
- Local scheduler for Windows and servers without cron
- Dry-run mode for previewing without sending
- Automatic message chunking (respects API limits)
- ES module codebase, Node.js ≥ 18

---

## Prerequisites

- **Node.js 18+** – [nodejs.org](https://nodejs.org/)
- **Anthropic API key** – [console.anthropic.com](https://console.anthropic.com/)
- A messenger account (Telegram bot, Discord webhook, or Gmail)

---

## Quick Start (3 Steps)

```bash
# 1. Install dependencies
npm install

# 2. Run the interactive setup wizard
npm run setup

# 3. Test with a dry run
npm test
```

---

## Command Reference

```
node digest.js [options]

Options:
  --topic,     -t  News topic to search for       (default: env NEWS_TOPIC or "Technology")
  --messenger, -m  Delivery: telegram|discord|email|none  (default: none)
  --count,     -c  Number of articles             (default: env ARTICLE_COUNT or 5)
  --dry,       -d  Preview without sending
  --output,    -o  Also save digest to this file path
  --help,      -h  Show help
```

### Examples

```bash
# Preview AI digest on "Quantum Computing"
node digest.js --topic "Quantum Computing" --dry

# Send to Telegram
node digest.js --topic "Space Exploration" --messenger telegram

# Send to Discord with 10 articles
node digest.js --topic "Finance" --messenger discord --count 10

# Send via email and also save to a file
node digest.js --topic "Health" --messenger email --output health.md

# Schedule daily runs (cross-platform)
node scheduler.js --run-now
```

### npm scripts

| Command | Description |
|---|---|
| `npm start` | Run digest with default settings |
| `npm test` | Dry-run test with topic "Artificial Intelligence" |
| `npm run setup` | Launch the interactive configuration wizard |

---

## Messenger Setup

### Telegram

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **Bot Token**
2. Start a chat with your bot
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` → copy `chat.id`

Set in `.env`:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=987654321
```

Messages longer than 4 096 characters are automatically split into multiple messages.

### Discord

1. Open your Discord server → channel **Settings** → **Integrations** → **Webhooks**
2. Click **New Webhook** → copy the URL

Set in `.env`:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Digests are sent as rich embeds. Messages longer than 4 096 characters are split into multiple embeds.

### Email (Gmail)

1. Enable 2FA on your Google account
2. Go to [myaccount.google.com](https://myaccount.google.com) → **Security** → **App passwords**
3. Create a password for "Mail"

Set in `.env`:
```
GMAIL_EMAIL=you@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

The digest is sent to the same address it is sent from, in both plain text and HTML.

---

## Automation Setup

### Linux / macOS – cron

```bash
crontab -e
```

Add a line (example: daily at 8:00 AM):
```
0 8 * * * cd /path/to/news-digest && node digest.js --topic "Technology" --messenger telegram
```

### Windows – Task Scheduler or scheduler.js

```bash
# Run the built-in scheduler (checks every minute)
node scheduler.js

# Run immediately and then on schedule
node scheduler.js --run-now
```

Environment variables for `scheduler.js`:

| Variable | Default | Description |
|---|---|---|
| `SCHEDULE_HOUR` | `8` | Hour to run (0–23) |
| `SCHEDULE_MINUTE` | `0` | Minute to run (0–59) |
| `NEWS_TOPIC` | `Technology` | Topic for the digest |
| `MESSENGER` | `none` | Delivery method |

### GitHub Actions

Create `.github/workflows/digest.yml`:

```yaml
name: Daily News Digest
on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: node digest.js --topic "Technology" --messenger telegram
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

---

## Configuration

All configuration lives in a `.env` file in the project root.
Run `npm run setup` to generate it, or copy `.env.example` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `TELEGRAM_BOT_TOKEN` | Telegram only | Bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Telegram only | Target chat ID |
| `DISCORD_WEBHOOK_URL` | Discord only | Webhook URL |
| `GMAIL_EMAIL` | Email only | Gmail address |
| `GMAIL_PASSWORD` | Email only | Gmail App Password |
| `NEWS_TOPIC` | No | Default topic (used by `npm start`) |
| `ARTICLE_COUNT` | No | Default article count (default: 5) |
| `SCHEDULE_HOUR` | No | Hour for scheduler.js (default: 8) |
| `SCHEDULE_MINUTE` | No | Minute for scheduler.js (default: 0) |

---

## Cost Estimation

Each digest call uses approximately:
- **Input**: ~300 tokens (prompt)
- **Output**: ~1 500–3 000 tokens (digest)
- **Web search**: ~3–10 search queries depending on topic

At Claude Opus 4.6 pricing (~$15/MTok in, ~$75/MTok out) a daily digest costs roughly **$0.10–$0.25 per run**.

---

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
Add the key to your `.env` file or export it:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### "Cannot find module" / "ERR_MODULE_NOT_FOUND"
Run `npm install` to install dependencies.

### Telegram: messages not arriving
- Make sure you have sent at least one message to your bot before running.
- Verify the `TELEGRAM_CHAT_ID` (it may be a negative number for group chats).

### Discord: 404 Webhook Not Found
The webhook may have been deleted. Regenerate it in Discord channel settings.

### Gmail: Invalid login / Authentication failed
- Use an **App Password**, not your regular password.
- Make sure 2FA is enabled on the account.

### Web search not working / empty digest
- Ensure your API key tier supports the `web_search_20250305` tool.
- The app falls back to knowledge-only mode if the tool is unavailable.

---

## API Reference

### `generateDigest(topic, articleCount) → Promise<string>`
Calls Claude with web search and returns the formatted digest text.

### `sendViaTelegram(digest) → Promise<void>`
Sends the digest via the Telegram Bot API. Reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from env.

### `sendViaDiscord(digest, topic) → Promise<void>`
Posts the digest as a Discord embed. Reads `DISCORD_WEBHOOK_URL` from env.

### `sendViaEmail(digest, topic) → Promise<void>`
Sends the digest via Gmail using nodemailer. Reads `GMAIL_EMAIL` and `GMAIL_PASSWORD` from env.

### `saveToFile(digest, topic, filePath?) → void`
Saves the digest as a Markdown file. Auto-names as `digest-<topic>-<date>.md` if no path given.

---

## Security Notes

- Never commit your `.env` file (it is in `.gitignore`).
- Use Gmail **App Passwords**, not your account password.
- Rotate API keys regularly.
- When using GitHub Actions, store secrets in **Settings → Secrets**.
- The Telegram bot token grants full control of the bot; keep it private.

---

## Project Structure

```
news-digest/
├── package.json        # Dependencies and scripts
├── .env.example        # Configuration template
├── .env                # Your configuration (git-ignored)
├── digest.js           # Main application
├── setup.js            # Interactive setup wizard
├── scheduler.js        # Cross-platform daily scheduler
├── README.md           # This file
├── QUICKSTART.md       # 5-minute quick start
└── node_modules/       # Installed by npm install
```

---

Powered by [Claude AI](https://claude.ai) · [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-node)
