const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

function startBot() {
  if (!BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not set.');
    return;
  }
  // Polling must be false to avoid conflict with n8n/webhooks
  bot = new TelegramBot(BOT_TOKEN, { polling: false });
  console.log('✅ Telegram Notification Service started (Sender Mode)');
}

// پارامتر options اضافه شد
const sendTelegramMessage = async (chatId, text, options = {}) => {
  if (!bot && BOT_TOKEN) bot = new TelegramBot(BOT_TOKEN, { polling: false });
  if (!bot || !chatId) return;

  try {
    // تنظیم پیش‌فرض برای پارس کردن مارک‌داون
    const defaultOptions = { parse_mode: 'Markdown', ...options };
    await bot.sendMessage(chatId, text, defaultOptions);
    console.log(`📩 Telegram message sent to ${chatId}`);
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.message);
  }
};

module.exports = { startBot, sendTelegramMessage };
