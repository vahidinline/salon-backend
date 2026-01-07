// services/fcmService.js
const admin = require('firebase-admin');

let isInitialized = false;

try {
  // بررسی می‌کنیم که آیا فایربیس قبلاً راه‌اندازی شده یا نه، تا از خطای تکراری جلوگیری شود
  if (admin.apps.length === 0) {
    // خواندن محتویات فایل کلید خصوصی از متغیر محیطی در آژور
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountEnv) {
      // اگر متغیر محیطی ست نشده باشد، خطا می‌دهیم
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.'
      );
    }

    let serviceAccount;
    try {
      // تلاش برای تبدیل رشته JSON به آبجکت جاوااسکریپت
      serviceAccount = JSON.parse(serviceAccountEnv);
    } catch (parseError) {
      // اگر رشته JSON معتبر نباشد (مثلاً ناقص کپی شده باشد)
      console.error(
        '❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable.'
      );
      throw parseError; // خطای اصلی را پرتاب می‌کنیم
    }

    // راه‌اندازی SDK ادمین فایربیس با کلید خصوصی خوانده شده
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isInitialized = true;
    console.log('✅ Firebase Admin Initialized successfully (from env var)');
  } else {
    isInitialized = true; // قبلاً راه‌اندازی شده
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  if (error.message.includes('environment variable is not set')) {
    console.error(
      '   -> Hint: Make sure to set "FIREBASE_SERVICE_ACCOUNT_JSON" in Azure App Service Configuration.'
    );
  }
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
