# Daily News Digest - Claude Code Task

You are implementing a production-ready daily news digest generator using the Anthropic Claude API.

## Project Goal

Create a complete Node.js application that:
1. Searches for relevant non-paywalled news articles
2. Uses Claude to evaluate and summarize them
3. Delivers digests via Telegram, Discord, or Email
4. Runs automatically on a schedule
5. Includes interactive setup and testing

## File Structure to Create

```
news-digest/
├── package.json
├── digest.js
├── setup.js
├── scheduler.js
├── README.md
├── QUICKSTART.md
├── .env.example
└── .gitignore
```

## Detailed Requirements

### 1. package.json
- Name: `daily-news-digest`
- Main entry: `digest.js`
- Dependencies:
  - `@anthropic-ai/sdk` (latest)
  - `nodemailer` (latest)
- Scripts:
  - `start`: `node digest.js`
  - `test`: `node digest.js --topic "Artificial Intelligence" --dry`
  - `setup`: `node setup.js`
- Engines: Node.js >=18
- Type: `module` (ES modules)

### 2. digest.js (Main Application)

**Functionality:**
- Command-line interface with argument parsing
- Arguments: --topic, --messenger, --count, --dry, --output
- Uses Anthropic API with web search tool
- Generates news digests with articles, summaries, and sources
- Sends via Telegram, Discord, or Email
- Handles message size limits (chunking)

**Implementation Details:**
```javascript
// Initialize Anthropic client from ANTHROPIC_API_KEY env var
// Parse CLI arguments using util.parseArgs
// Function: generateDigest(topic, articleCount) - returns Promise<string>
// Function: sendViaTelegram(digest) - sends via Telegram Bot API
// Function: sendViaDiscord(digest, topic) - sends via Discord webhook
// Function: sendViaEmail(digest, topic) - sends via Gmail
// Function: saveToFile(digest, topic) - saves to .md file
// Main execution with error handling
```

**Output Format:**
```
[Title]
Source: [Publication]
URL: [Link]
Summary: [2-3 sentences]
Relevance: [Why it matters to the topic]
---
[Next article...]

Generated: [Timestamp]
Powered by Claude
```

**Error Handling:**
- Check required environment variables
- Validate API responses
- Handle network errors gracefully
- Log errors to console

### 3. setup.js (Configuration Wizard)

**Functionality:**
- Interactive CLI using readline
- Guides user through configuration
- Saves to `.env` file
- Installs dependencies
- Optional: Creates cron job
- Optional: Runs test

**Prompts (in order):**
1. Anthropic API key
2. Messenger choice (Telegram/Discord/Email)
3. Messenger credentials (token/webhook/password)
4. News topic
5. Articles per digest (default: 5)
6. Daily time (default: 8 AM)
7. Install dependencies?
8. Run test now?
9. Set up cron job? (Unix only)

**Output:**
- `.env` file with all credentials
- Summary of configuration
- Quick-start commands

### 4. scheduler.js (Local Task Scheduler)

**Functionality:**
- Runs digest at scheduled time daily
- Logs to `digest-schedule.log`
- Alternative to cron (useful for Windows)
- Checks time every minute
- Prevents duplicate runs

**Features:**
- Option to run immediately on start
- Logs next scheduled run time
- Maintains log file with timestamps
- Graceful shutdown handling

### 5. README.md (Full Documentation)

**Sections:**
- Overview and features
- Prerequisites and installation
- Quick start (3 steps)
- Command reference with examples
- Messenger setup instructions (Telegram, Discord, Email)
- Automation setup (cron, Windows Task Scheduler, GitHub Actions)
- Configuration details
- Cost estimation
- Troubleshooting
- API reference
- Security notes

**Include:**
- Code examples
- Tables for reference
- Links to official docs
- Common issues and solutions

### 6. QUICKSTART.md (5-Minute Guide)

**Sections:**
- Step 1: Get API key (2 min)
- Step 2: Set up messenger (2 min)
- Step 3: Run setup (1 min)
- Step 4: Test it (instant)
- Step 5: Enable automation (varies)
- Troubleshooting quick fixes

**Style:** Brief, bullet-pointed, action-oriented

### 7. .env.example (Template)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Choose ONE messenger:
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
# OR
DISCORD_WEBHOOK_URL=...
# OR
GMAIL_EMAIL=...
GMAIL_PASSWORD=...

# Optional
NEWS_TOPIC=Technology
ARTICLE_COUNT=5
```

### 8. .gitignore

```
.env
node_modules/
*.log
.DS_Store
```

## Key Implementation Details

### API Usage
- Use `claude-opus-4-6` model
- Enable web_search tool
- Max tokens: 4000
- Prompt template: Find N recent non-paywalled articles about [TOPIC]

### Messenger Integration
- **Telegram**: Use telegram.org bot API, split messages >4096 chars
- **Discord**: Use webhook API, split messages >2000 chars, use embeds
- **Email**: Use nodemailer with Gmail, format as HTML

### Error Handling
- Validate environment variables on startup
- Catch API errors with descriptive messages
- Retry logic for transient failures
- Log all errors with timestamps

### Code Quality
- Use ES modules (import/export)
- Add JSDoc comments to functions
- Error handling in all async operations
- Graceful degradation
- Clear console output with emojis for UX

## Output Requirements

All code should:
- ✅ Be production-ready
- ✅ Include comprehensive error handling
- ✅ Have clear error messages
- ✅ Support the CLI interface properly
- ✅ Work with the Anthropic SDK
- ✅ Include JSDoc comments
- ✅ Be well-formatted and readable
- ✅ Follow Node.js best practices

## Testing Requirements

The application should:
- ✅ Run `npm test` successfully
- ✅ Support `--dry` flag for preview without sending
- ✅ Validate all required environment variables
- ✅ Handle missing dependencies gracefully
- ✅ Provide helpful error messages

## Implementation Notes

1. **Web Search Tool**: Use the tools parameter with web_search_20250305 type
2. **Message Parsing**: Claude's response contains both text and potential tool use blocks
3. **File I/O**: All files should be created in current working directory
4. **Environment**: Use dotenv implicitly through .env file reading
5. **Timestamps**: Use timezone-aware timestamps for digest metadata

---

## Start Implementation

Create all files above with full, production-ready implementations. Include all error handling, environment variable validation, and documentation inline.

For each file, ensure it:
- Handles errors gracefully
- Validates input
- Provides helpful output
- Follows the specifications exactly
- Is ready for production use
