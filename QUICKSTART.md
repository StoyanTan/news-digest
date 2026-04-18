# Quick Start Guide – Daily News Digest

Get your first digest in 5 minutes.

---

## Step 1: Get an Anthropic API Key (2 min)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys** and click **Create Key**
4. Copy the key (starts with `sk-ant-…`)

---

## Step 2: Set Up a Messenger (2 min)

Pick **one** of the following:

### Discord
1. Open your Discord server → **Channel Settings** → **Integrations** → **Webhooks**
2. Click **New Webhook** and copy the URL

### Email (Gmail)
1. Enable 2FA on your Google account
2. Go to [myaccount.google.com](https://myaccount.google.com) → **Security** → **App passwords**
3. Generate a password for "Mail" and copy it

---

## Step 3: Run Setup (1 min)

```bash
npm install
npm run setup
```

The wizard will ask for your API key, messenger credentials, topic, and schedule.

---

## Step 4: Test It (instant)

```bash
npm test
```

This runs a smoke test — a minimal API call that confirms your key works without generating a full digest.

Test the full digest with a preview:

```bash
npx tsx digest.ts --topic "Climate Change" --dry
```

---

## Step 5: Enable Automation

### Linux / macOS (cron)
```bash
crontab -e
# Add (runs daily at 8 AM):
0 8 * * * cd /path/to/news-digest && npx tsx digest.ts --topic "Technology" --messenger discord
```

### Windows / cross-platform (scheduler.ts)
```bash
npx tsx scheduler.ts
# Runs in the foreground – use a process manager like PM2 or Windows Task Scheduler
# to keep it alive.
```

### Send now
```bash
npx tsx digest.ts --topic "Technology" --messenger discord
```

---

## Troubleshooting Quick Fixes

| Problem | Fix |
|---|---|
| `ANTHROPIC_API_KEY not found` | Add it to your `.env` file or `export` it |
| `Module not found` | Run `npm install` |
| Discord: 404 error | Regenerate the webhook URL |
| Gmail: auth error | Use an App Password, not your account password |
| Empty digest | Check your API key tier supports `claude-opus-4-6` |
