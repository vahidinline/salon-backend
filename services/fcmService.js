// services/fcmService.js
const admin = require('firebase-admin');
const path = require('path');

// مسیر فایل JSON کلید خصوصی که از کنسول فایربیس دانلود کردید.
// فرض بر این است که این فایل در ریشه پروژه (کنار index.js و package.json) قرار دارد
// و نام آن دقیقاً 'firebase-service-account.json' است.
const serviceAccountPath = path.join(
  process.cwd(),
  'firebase-service-account.json'
);

let isInitialized = false;

try {
  // بررسی می‌کنیم که آیا فایربیس قبلاً راه‌اندازی شده یا نه، تا از خطای تکراری جلوگیری شود
  if (admin.apps.length === 0) {
    // خواندن فایل کلید خصوصی
    const serviceAccount = require(serviceAccountPath);

    // راه‌اندازی SDK ادمین فایربیس با کلید خصوصی
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isInitialized = true;
    console.log('✅ Firebase Admin Initialized successfully');
  } else {
    isInitialized = true; // قبلاً راه‌اندازی شده
  }
} catch (error) {
  console.error(
    '❌ Error initializing Firebase Admin. Check if "firebase-service-account.json" exists in project root.',
    error.message
  );
  // اگر فایل کلید پیدا نشود یا مشکل داشته باشد، این خطا چاپ می‌شود.
}

/**
 * تابع ارسال Push Notification به یک توکن خاص
 * @param {string} registrationToken - توکن FCM دستگاه گیرنده (مثلاً توکن گوشی ادمین)
 * @param {string} title - عنوان نوتیفیکیشن
 * @param {string} body - متن اصلی نوتیفیکیشن
 * @param {object} data - (اختیاری) داده‌های اضافی برای ارسال همراه پیام
 */
const sendPushNotification = async (
  registrationToken,
  title,
  body,
  data = {}
) => {
  // اگر فایربیس درست راه‌اندازی نشده یا توکن نداریم، کاری انجام نده
  if (!isInitialized) {
    console.warn('⚠️ Cannot send push: Firebase Admin is not initialized.');
    return;
  }
  if (!registrationToken) {
    console.warn('⚠️ Cannot send push: No registration token provided.');
    return;
  }

  // ساختار پیام برای ارسال به FCM
  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data, // داده‌های اضافی (اختیاری)
    token: registrationToken, // توکن دستگاه مقصد
  };

  try {
    // ارسال پیام به سرورهای گوگل
    const response = await admin.messaging().send(message);
    console.log('📨 Push notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    // در یک سیستم واقعی، اینجا می‌توان خطاهای مربوط به توکن‌های منقضی شده را مدیریت کرد
    throw error;
  }
};

// اکسپورت کردن تابع برای استفاده در فایل‌های دیگر (مثل Booking.js)
module.exports = { sendPushNotification };
