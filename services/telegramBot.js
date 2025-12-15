const TelegramBot = require('node-telegram-bot-api');
// مدل‌ها برای لاجیک‌های داخلی خود بات (اگر نیاز باشد)
const Reservation = require('../models/reservations');
const Availability = require('../models/Availability');
const Service = require('../models/Service');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

function startBot() {
  if (!BOT_TOKEN) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN not set. Bot will not start.');
    return;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  // ... (کدهای قبلی هندل کردن پیام‌های ورودی و کال‌بک‌ها اینجا می‌مانند) ...
  // اگر کدهای قبلی هندل کردن پیام‌ها را دارید، آن‌ها را نگه دارید.

  console.log('✅ Telegram bot started');
}

/**
 * تابع جدید برای ارسال پیام به کاربر از طریق سایر بخش‌های برنامه
 */
const sendTelegramMessage = async (chatId, text) => {
  if (!bot) {
    console.warn('Bot is not initialized. Cannot send message.');
    return;
  }
  if (!chatId) {
    console.warn('No chatId provided for Telegram message.');
    return;
  }

  try {
    await bot.sendMessage(chatId, text);
    console.log(`📩 Telegram message sent to ${chatId}`);
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.message);
  }
};

module.exports = { startBot, sendTelegramMessage };
