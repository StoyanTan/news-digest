# 🚀 Claude Code Quick Reference

## Installation (One-Time)

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-your-key

# Verify installation
claude-code --version
```

## Creating the Project

### Option 1: All at Once (Recommended)

```bash
# Create project folder
mkdir news-digest && cd news-digest

# Build everything with one command
claude-code "Create the complete daily news digest application with:
- package.json with @anthropic-ai/sdk and nodemailer
- digest.js main script with CLI arguments
- setup.js interactive wizard
- scheduler.js for scheduling
- README.md and QUICKSTART.md
- .env.example template
Follow the production requirements in CLAUDE_CODE_TASK.md"
```

### Option 2: Step by Step

```bash
# Step 1: Create and install dependencies
claude-code "Create package.json for daily news digest project"
npm install

# Step 2: Create main script
claude-code "Create digest.js with CLI argument parsing and Anthropic API integration"

# Step 3: Create setup wizard
claude-code "Create setup.js as an interactive configuration wizard"

# Step 4: Create scheduler
claude-code "Create scheduler.js for running digests on a schedule"

# Step 5: Create documentation
claude-code "Create README.md with full project documentation"
claude-code "Create QUICKSTART.md with 5-minute quick start guide"
```

## Working with Your Code

### Test the Project

```bash
# Install dependencies
npm install

# Run test
npm test

# Or test with custom topic
node digest.js --topic "Your Topic" --dry
```

### Make Changes with Claude Code

```bash
# Add a new feature
claude-code "Add support for Slack webhooks to digest.js"

# Fix a bug
claude-code "Fix the issue where Discord messages aren't formatted properly"

# Improve code
claude-code "Add better error messages to setup.js"

# Add documentation
claude-code "Add JSDoc comments to all functions in digest.js"

# Optimize performance
claude-code "Optimize digest.js to reduce API calls"
```

### Debug Issues

```bash
# Understand a problem
claude-code "Analyze digest.js and explain how the web search integration works"

# Fix specific error
claude-code "Fix the error: 'ANTHROPIC_API_KEY not found' in digest.js"

# Review for quality
claude-code "Review digest.js for security vulnerabilities and best practices"
```

## Key Claude Code Commands

```bash
# Create a file
claude-code "Create [filename] that does [description]"

# Modify a file
claude-code "Update [filename] to [change description]"

# Add to a file
claude-code "Add [feature] to [filename]"

# Analyze code
claude-code "Analyze [filename] for [concern]"

# Debug
claude-code "Debug the issue in [filename]: [error description]"

# Review
claude-code "Review [filename] for [quality metric]"

# Refactor
claude-code "Refactor [filename] to improve [aspect]"

# Test
claude-code "Create test-suite.js to test [functionality]"
```

## Common Workflows

### Workflow 1: Initial Setup (15 minutes)

```bash
# 1. Install Claude Code
npm install -g @anthropic-ai/claude-code

# 2. Create project
mkdir news-digest && cd news-digest
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Generate all files
claude-code "Create complete news digest project following CLAUDE_CODE_TASK.md specification"

# 4. Install dependencies
npm install

# 5. Test
npm test

# 6. Verify file structure
ls -la
```

### Workflow 2: Run Your First Digest

```bash
# 1. Setup configuration
npm run setup

# 2. Test it
npm test

# 3. Send to Telegram
node digest.js --topic "Your Topic" --messenger telegram

# 4. Schedule daily runs
crontab -e
# Add: 0 8 * * * cd /path/to/news-digest && node digest.js --topic "Your Topic" --messenger telegram
```

### Workflow 3: Add New Feature

```bash
# 1. Describe what you want
claude-code "Add support for Slack to digest.js as a new messenger option"

# 2. Test the changes
npm test

# 3. Verify it works
node digest.js --topic "Test" --messenger slack --dry
```

### Workflow 4: Fix Issues

```bash
# 1. Identify the problem
# You get an error when running the script

# 2. Ask Claude Code to fix it
claude-code "Fix the error in setup.js where environment variables are not being loaded"

# 3. Test the fix
npm run setup

# 4. Verify it works
npm test
```

## Pro Tips

### 1. Use Existing Files as Context

```bash
# Claude Code reads all files in your project
# It will naturally follow patterns from existing code
claude-code "Create scheduler.js similar to how digest.js handles errors"
```

### 2. Reference the Task File

```bash
# Point to your specification
claude-code "Create digest.js following the detailed spec in CLAUDE_CODE_TASK.md"
```

### 3. Test Incrementally

```bash
# After each change, test immediately
npm test

# This catches issues early
```

### 4. Use Dry-Run Mode

```bash
# Always preview before sending
node digest.js --topic "Your Topic" --dry

# Then run for real
node digest.js --topic "Your Topic" --messenger telegram
```

### 5. Save Successful Patterns

```bash
# If you like how something works, ask Claude Code to use it elsewhere
claude-code "Use the same error handling pattern from digest.js in setup.js"
```

## File Locations

After creation, your project will have:

```
news-digest/
├── package.json              # Dependencies
├── .env.example              # Configuration template
├── digest.js                 # Main program (~/20KB)
├── setup.js                  # Setup wizard (~/10KB)
├── scheduler.js              # Local scheduler (~/5KB)
├── README.md                 # Full docs (~/15KB)
├── QUICKSTART.md             # Quick start (~/5KB)
├── .gitignore
└── node_modules/             # Dependencies (created by npm install)
```

## Troubleshooting

### "claude-code: command not found"
```bash
npm install -g @anthropic-ai/claude-code
```

### "API key not found"
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key
```

### "Module errors"
```bash
npm install
```

### "Permission denied"
```bash
chmod +x digest.js
chmod +x setup.js
chmod +x scheduler.js
```

### File not created
```bash
# Check current directory
pwd

# Claude Code creates files in current directory
# Make sure you're in the right folder
cd news-digest
```

## Next Steps

1. ✅ Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. ✅ Set API key: `export ANTHROPIC_API_KEY=...`
3. ✅ Create project: `mkdir news-digest && cd news-digest`
4. ✅ Generate files: `claude-code "Create complete news digest project..."`
5. ✅ Test: `npm test`
6. ✅ Configure: `npm run setup`
7. ✅ Deploy: Use cron or GitHub Actions

## More Help

- Claude Code docs: https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md
- Anthropic API: https://docs.claude.com/en/docs_site_map.md
- Node.js docs: https://nodejs.org/docs/

---

**Quick Start Now:**
```bash
npm install -g @anthropic-ai/claude-code
mkdir news-digest && cd news-digest
export ANTHROPIC_API_KEY=sk-ant-your-key
claude-code "Create the complete daily news digest application"
```

Happy coding! 🚀
