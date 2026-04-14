declare namespace NodeJS {
  interface ProcessEnv {
    // Required
    ANTHROPIC_API_KEY?: string;

    // Telegram
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;

    // Discord
    DISCORD_WEBHOOK_URL?: string;

    // Gmail
    GMAIL_EMAIL?: string;
    GMAIL_PASSWORD?: string;

    // Optional
    NEWS_TOPIC?: string;
    ARTICLE_COUNT?: string;

    // Scheduler-specific
    SCHEDULE_HOUR?: string;
    SCHEDULE_MINUTE?: string;
    MESSENGER?: string;
  }
}
