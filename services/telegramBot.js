// services/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const Reservation = require('../models/Reservation');
const Availability = require('../models/Availability');
const Service = require('../models/Service');
const { parseUserMessageToIntent } = require('./azureAgent');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) console.warn('TELEGRAM_BOT_TOKEN not set');

let bot = null;

function startBot() {
  bot = new TelegramBot(BOT_TOKEN, { polling: true });

  /**
   * Helper: find or create active reservation for a chat
   */
  async function getActiveReservation(chatId, userId, intent) {
    let reservation = await Reservation.findOne({
      chatId,
      status: { $in: ['pending', 'awaiting_user_details'] },
    }).sort({ createdAt: -1 });

    if (!reservation && intent === 'reservation') {
      reservation = new Reservation({
        chatId,
        userId,
        intent,
        status: 'pending',
      });
      await reservation.save();
    }

    return reservation;
  }

  /**
   * Handle text messages
   */
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);
    const text = msg.text || '';
    try {
      // Parse message with AI
      const parsed = await parseUserMessageToIntent(text);
      const { intent, service, operator_name, preferred_datetime, reply } =
        parsed;

      let reservation = await getActiveReservation(
        chatId,
        msg.from?.id ? String(msg.from.id) : undefined,
        intent
      );

      // Handle intents
      if (intent === 'feedback') {
        await bot.sendMessage(chatId, reply || 'لطفاً بازخورد خود را بفرستید.');
        return;
      }

      if (intent === 'other' && !reservation) {
        await bot.sendMessage(
          chatId,
          reply || 'سلام! برای رزرو وقت، فقط بگویید: "وقت می‌خواهم".'
        );
        return;
      }

      if (intent === 'reservation' && reservation) {
        // Update reservation fields if missing
        if (service && !reservation.service) {
          let serviceDoc = await Service.findOne({ name: service });
          if (!serviceDoc) {
            serviceDoc = await Service.findOne({
              name: { $regex: service, $options: 'i' },
            });
          }
          if (serviceDoc) {
            reservation.service = serviceDoc._id;
          }
        }

        if (preferred_datetime && !reservation.preferredDatetime) {
          reservation.preferredDatetime = new Date(preferred_datetime);
        }

        await reservation.save();

        // Branch: missing service
        if (!reservation.service) {
          const services = await Service.find({});
          if (services.length === 0) {
            await bot.sendMessage(chatId, 'هنوز سرویسی ثبت نشده است.');
            return;
          }
          const keyboard = services.map((s) => [
            {
              text: `${s.name} — ${s.duration}min — ${s.price}`,
              callback_data: JSON.stringify({
                t: 'select_service',
                resId: reservation._id.toString(),
                serviceId: s._id.toString(),
              }),
            },
          ]);
          await bot.sendMessage(chatId, 'کدام سرویس را می‌خواهید؟', {
            reply_markup: { inline_keyboard: keyboard },
          });
          return;
        }

        // Branch: service known → propose availabilities
        if (reservation.service && !reservation.selectedAvailability) {
          const query = { service: reservation.service, isBooked: false };
          if (reservation.preferredDatetime) {
            const pref = reservation.preferredDatetime;
            const startWindow = new Date(pref.getTime() - 2 * 24 * 3600 * 1000);
            const endWindow = new Date(pref.getTime() + 2 * 24 * 3600 * 1000);
            query.start = { $gte: startWindow, $lte: endWindow };
          }
          const options = await Availability.find(query)
            .populate('employee service')
            .limit(5)
            .sort({ start: 1 });

          if (options.length === 0) {
            await bot.sendMessage(chatId, 'هیچ وقت آزادی پیدا نشد.');
            return;
          }

          reservation.proposedOptions = options.map((o) => o._id);
          await reservation.save();

          const keyboard = options.map((opt) => [
            {
              text: `${opt.employee.name} — ${new Date(
                opt.start
              ).toLocaleString('fa-IR')}`,
              callback_data: JSON.stringify({
                t: 'select_option',
                resId: reservation._id.toString(),
                availId: opt._id.toString(),
              }),
            },
          ]);

          await bot.sendMessage(chatId, 'گزینه‌های موجود:', {
            reply_markup: { inline_keyboard: keyboard },
          });
          return;
        }
      }

      // If waiting for name/phone
      if (reservation && reservation.status === 'awaiting_user_details') {
        const phoneMatch = text.match(/(09\d{9})|(\+98\d{10})|(\d{10,12})/);
        const nameMatch =
          text.match(/نام[:\s\-–]*([^\n,،]+)/i) || text.match(/^([^\d\n]+)\s/);

        if (!phoneMatch) {
          await bot.sendMessage(
            chatId,
            'شماره تلفن معتبر پیدا نشد. لطفاً دوباره وارد کنید.'
          );
          return;
        }

        const phone = phoneMatch[0];
        const name = nameMatch
          ? (nameMatch[1] || nameMatch[0]).trim()
          : msg.from?.first_name || 'مشتری';

        const availability = await Availability.findById(
          reservation.selectedAvailability
        ).populate('service employee');
        if (!availability || availability.isBooked) {
          reservation.status = 'cancelled';
          await reservation.save();
          await bot.sendMessage(chatId, 'این زمان دیگر موجود نیست.');
          return;
        }

        availability.isBooked = true;
        availability.bookedBy = reservation._id;
        await availability.save();

        reservation.customerName = name;
        reservation.customerPhone = phone;
        reservation.status = 'confirmed';
        await reservation.save();

        const confirmMsg = `رزرو شما ثبت شد ✅
سرویس: ${availability.service.name}
اپراتور: ${availability.employee.name}
زمان: ${new Date(availability.start).toLocaleString('fa-IR')}
نام: ${name}
تلفن: ${phone}

لطفاً هزینه را به شماره کارت زیر پرداخت کنید:
**** **** **** 1234
`;

        await bot.sendMessage(chatId, confirmMsg);
      }
    } catch (e) {
      console.error('Message handler error', e);
      await bot.sendMessage(chatId, 'خطایی رخ داد. دوباره تلاش کنید.');
    }
  });

  /**
   * Handle inline button callbacks
   */
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = String(callbackQuery.message.chat.id);
    let payload;
    try {
      payload = JSON.parse(callbackQuery.data);
    } catch {
      return bot.answerCallbackQuery(callbackQuery.id, { text: 'خطا' });
    }

    try {
      if (payload.t === 'select_service') {
        const reservation = await Reservation.findById(payload.resId);
        if (!reservation) return;

        reservation.service = payload.serviceId;
        await reservation.save();

        const avail = await Availability.find({
          service: payload.serviceId,
          isBooked: false,
        })
          .populate('employee service')
          .limit(5)
          .sort({ start: 1 });

        if (avail.length === 0) {
          await bot.sendMessage(chatId, 'هیچ وقت آزادی برای این سرویس نیست.');
          return;
        }

        reservation.proposedOptions = avail.map((a) => a._id);
        await reservation.save();

        const keyboard = avail.map((opt) => [
          {
            text: `${opt.employee.name} — ${new Date(opt.start).toLocaleString(
              'fa-IR'
            )}`,
            callback_data: JSON.stringify({
              t: 'select_option',
              resId: reservation._id.toString(),
              availId: opt._id.toString(),
            }),
          },
        ]);

        await bot.sendMessage(chatId, 'لطفاً یک زمان را انتخاب کنید:', {
          reply_markup: { inline_keyboard: keyboard },
        });
      }

      if (payload.t === 'select_option') {
        const reservation = await Reservation.findById(payload.resId);
        if (!reservation) return;

        reservation.selectedAvailability = payload.availId;
        reservation.status = 'awaiting_user_details';
        await reservation.save();

        await bot.sendMessage(
          chatId,
          'لطفاً نام و شماره تلفن خود را وارد کنید (مثال: "نام: علی — 0912xxxxxxx").'
        );
      }

      await bot.answerCallbackQuery(callbackQuery.id);
    } catch (e) {
      console.error('Callback handler error', e);
      await bot.answerCallbackQuery(callbackQuery.id, {
        text: 'خطا در پردازش',
      });
    }
  });

  console.log('Telegram bot started ✅');
}

module.exports = { startBot };
