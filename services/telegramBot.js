const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

function startBot() {
  if (!BOT_TOKEN) {
    console.warn(
      '⚠️ TELEGRAM_BOT_TOKEN not set. Bot notification service disabled.'
    );
    return;
  }

  // تغییر مهم: polling را false کردیم تا با n8n تداخل نداشته باشد
  // این حالت فقط اجازه ارسال پیام را می‌دهد و پیامی دریافت نمی‌کند
  bot = new TelegramBot(BOT_TOKEN, { polling: false });

  console.log('✅ Telegram Notification Service started (Sender Mode)');
}

/**
 * تابع ارسال پیام به کاربر
 */
const sendTelegramMessage = async (chatId, text) => {
  if (!bot) {
    // تلاش برای مقداردهی مجدد در صورت نال بودن (محکم‌کاری)
    if (BOT_TOKEN) {
      bot = new TelegramBot(BOT_TOKEN, { polling: false });
    } else {
      console.error('❌ Bot token is missing. Cannot send message.');
      return;
    }
  }

  if (!chatId) {
    console.warn('⚠️ No chatId provided for Telegram message.');
    return;
  }

  try {
    await bot.sendMessage(chatId, text);
    console.log(`📩 Telegram message sent to ${chatId}`);
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.message);
    // اگر ارور 403 باشد یعنی کاربر ربات را بلاک کرده است
    if (error.response && error.response.statusCode === 403) {
      console.log('User has blocked the bot.');
    }
  }
};

module.exports = { startBot, sendTelegramMessage };
