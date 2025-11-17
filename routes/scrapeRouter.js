// const express = require('express');
// const router = express.Router();
// const puppeteer = require('puppeteer');
// const cheerio = require('cheerio');
// const Conversation = require('../models/Conversation');

// // Azure
// const AZURE_ENDPOINT = 'https://smarty-care-rag.openai.azure.com';
// const AZURE_KEY =
//   '6mptT2BZBCGdkA7YDRyzWifTeM4izRToBIGiDsL712ANn5wGVUcuJQQJ99BEACYeBjFXJ3w3AAABACOG2UP8';
// const AZURE_DEPLOYMENT = 'gpt-4o-mini';
// const AZURE_API_VERSION = '2025-01-01-preview';

// /* -------- Helpers -------- */

// // تبدیل اعداد فارسی به انگلیسی
// function faToEnNumbers(str) {
//   const map = {
//     '۰': '0',
//     '۱': '1',
//     '۲': '2',
//     '۳': '3',
//     '۴': '4',
//     '۵': '5',
//     '۶': '6',
//     '۷': '7',
//     '۸': '8',
//     '۹': '9',
//   };
//   return str.replace(/[۰-۹]/g, (d) => map[d]);
// }

// async function fetchRenderedHtml(pageUrl) {
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     args: ['--no-sandbox'],
//   });
//   const page = await browser.newPage();
//   await page.goto(pageUrl, { waitUntil: 'networkidle0' });
//   await new Promise((r) => setTimeout(r, 1500));
//   const html = await page.content();
//   await browser.close();
//   return html;
// }

// // function extractFromHtml(html, baseUrl = '') {
// //   const $ = cheerio.load(html);
// //   const title = $('title').first().text().trim() || null;
// //   const ogTitle = $('meta[property="og:title"]').attr('content') || null;

// //   const headings = [];
// //   $('h1,h2').each((i, el) => headings.push($(el).text().trim()));

// //   const metaDesc = $('meta[name="description"]').attr('content') || null;
// //   const ogDesc = $('meta[property="og:description"]').attr('content') || null;

// //   const bodyText = $('body').text();

// //   // Regex برای استخراج قیمت‌ها (فارسی و انگلیسی)
// //   const priceRegex = /[\d۰-۹]{1,3}(?:[.,\d۰-۹]{0,})\s*(?:تومان|ت|ریال)?/g;
// //   const priceCandidates = [...new Set(bodyText.match(priceRegex) || [])]
// //     .map((p) => faToEnNumbers(p.replace(/\s|تومان|ت|ریال/g, '')))
// //     .map((p) => Number(p))
// //     .filter((p) => !isNaN(p) && p > 0);

// //   // انتخاب بیشترین قیمت واقعی
// //   const priceString = priceCandidates.length
// //     ? priceCandidates.sort((a, b) => b - a)[0].toLocaleString() + ' تومان'
// //     : 'نامشخص';

// //   const images = new Set();
// //   const ogImage = $('meta[property="og:image"]').attr('content');
// //   if (ogImage) images.add(ogImage);
// //   $('img').each((i, el) => {
// //     let src = $(el).attr('src') || $(el).attr('data-src');
// //     if (src && !src.startsWith('data:')) {
// //       try {
// //         src = new URL(src, baseUrl).href;
// //       } catch (e) {}
// //       images.add(src);
// //     }
// //   });

// //   const colors = new Set();
// //   $('[data-color],[data-colour], .swatch, .color, .colour').each((i, el) => {
// //     const c =
// //       $(el).attr('data-color') || $(el).attr('data-colour') || $(el).text();
// //     if (c) colors.add(c.trim());
// //   });

// //   let productDescription = null;
// //   const descSelectors = [
// //     '#productDescription',
// //     '.product-description',
// //     '.description',
// //     '#description',
// //     '.prod-desc',
// //     '.product-details',
// //     '[itemprop="description"]',
// //   ];
// //   for (const s of descSelectors) {
// //     const el = $(s).first();
// //     if (el.length) {
// //       productDescription = el.text().trim();
// //       break;
// //     }
// //   }
// //   if (!productDescription)
// //     productDescription =
// //       $('p')
// //         .toArray()
// //         .map((p) => $(p).text().trim())
// //         .find((t) => t.length > 50) || null;

// //   return {
// //     title: ogTitle || title,
// //     rawTitle: title,
// //     headings,
// //     description: ogDesc || metaDesc || productDescription,
// //     priceString,
// //     images: Array.from(images).slice(0, 30),
// //     colors: Array.from(colors).slice(0, 20),
// //   };
// // }

// function extractFromHtml(html, baseUrl = '') {
//   const $ = cheerio.load(html);
//   const title = $('title').first().text().trim() || null;
//   const ogTitle = $('meta[property="og:title"]').attr('content') || null;

//   // توضیحات
//   let description =
//     $('meta[name="description"]').attr('content') ||
//     $('meta[property="og:description"]').attr('content') ||
//     $('#productDescription, .product-description, .description')
//       .first()
//       .text()
//       .trim() ||
//     null;

//   // تصاویر
//   const images = new Set();
//   $('img').each((i, el) => {
//     let src = $(el).attr('src') || $(el).attr('data-src');
//     if (src && !src.startsWith('data:')) {
//       try {
//         src = new URL(src, baseUrl).href;
//       } catch (e) {}
//       images.add(src);
//     }
//   });

//   // استخراج رنگ‌ها از جدول variations
//   const colors = [];
//   $('table.variations select[name="attribute_pa_color"] option').each(
//     (i, el) => {
//       const color = $(el).text().trim();
//       if (color && color !== 'یک گزینه را انتخاب کنید') colors.push(color);
//     }
//   );

//   // استخراج سایزها
//   const sizes = [];
//   $('table.variations select[name="attribute_pa_size"] option').each(
//     (i, el) => {
//       const size = $(el).text().trim();
//       if (size && size !== 'یک گزینه را انتخاب کنید') sizes.push(size);
//     }
//   );

//   //   // استخراج قیمت واقعی از span.price یا class مشابه
//   //   let priceText = $('.price, .woocommerce-Price-amount').first().text().trim();
//   //   priceText = priceText.replace(/\s/g, ''); // حذف فاصله‌ها
//   //   const priceNumber = Number(faToEnNumbers(priceText.replace(/[^0-9]/g, '')));
//   //   const priceString = priceNumber
//   //     ? priceNumber.toLocaleString('fa-IR') + ' تومان'
//   //     : 'نامشخص';

//   let priceNumber = null;
//   // جستجو در تمام المنت‌های قیمت
//   $('.price, .woocommerce-Price-amount, ins span.amount').each((i, el) => {
//     let text = $(el).text().trim().replace(/\s/g, ''); // حذف فاصله‌ها
//     text = faToEnNumbers(text); // تبدیل اعداد فارسی به انگلیسی
//     const num = Number(text.replace(/[^0-9]/g, '')); // فقط اعداد
//     if (num > 0) {
//       priceNumber = num;
//       return false; // خروج از each بعد از یافتن اولین قیمت معتبر
//     }
//   });

//   const priceString = priceNumber
//     ? priceNumber.toLocaleString('fa-IR') + ' تومان'
//     : 'نامشخص';

//   return {
//     title: ogTitle || title,
//     rawTitle: title,
//     description,
//     images: Array.from(images).slice(0, 30),
//     colors,
//     sizes,
//     priceString,
//   };
// }

// // تابع کمکی برای تبدیل اعداد فارسی به انگلیسی
// function faToEnNumbers(str) {
//   const map = {
//     '۰': '0',
//     '۱': '1',
//     '۲': '2',
//     '۳': '3',
//     '۴': '4',
//     '۵': '5',
//     '۶': '6',
//     '۷': '7',
//     '۸': '8',
//     '۹': '9',
//   };
//   return str.replace(/[۰-۹]/g, (d) => map[d]);
// }

// async function callAzureOpenAI(messages) {
//   const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
//   const body = { messages, max_tokens: 700, temperature: 0.2 };
//   const res = await fetch(url, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', 'api-key': AZURE_KEY },
//     body: JSON.stringify(body),
//   });
//   if (!res.ok) {
//     const text = await res.text();
//     return { error: `Azure OpenAI error ${res.status}: ${text}` };
//   }
//   const data = await res.json();
//   const reply = data.choices?.[0]?.message?.content || null;
//   return { raw: data, reply };
// }

// /* -------- API Route -------- */

// router.post('/', async (req, res) => {
//   try {
//     const { userId, url, userQuery, selectedColor, selectedSize } = req.body;
//     if (!url || !userId)
//       return res.status(400).json({ error: 'userId and url required' });

//     // 1) رندر و استخراج محصول
//     const html = await fetchRenderedHtml(url);
//     const extracted = extractFromHtml(html, url);

//     // 2) بازیابی مکالمه قبلی
//     let conversation = await Conversation.findOne({ userId, productUrl: url });
//     if (!conversation) {
//       conversation = new Conversation({
//         userId,
//         productUrl: url,
//         productInfo: extracted,
//         messages: [],
//       });
//     }

//     // 3) پرامپت مکالمه‌ای
//     const systemPrompt = {
//       role: 'system',
//       content: `شما یک دستیار خرید هستید.
// اطلاعات محصول: ${JSON.stringify(extracted, null, 2)}
// قواعد:
// - پاسخ دوستانه و مکالمه‌ای باشد
// - اگر نیاز به اطلاعات بیشتر است، حتماً سوال بپرس
// - پاسخ را به فارسی بده
// - قیمت، رنگ و تصاویر را ذکر کن`,
//     };

//     // پیام کاربر
//     let userContent = userQuery || '';
//     if (selectedColor) userContent += `\nرنگ انتخابی: ${selectedColor}`;
//     if (selectedSize) userContent += `\nسایز انتخابی: ${selectedSize}`;

//     const messages = [
//       systemPrompt,
//       ...conversation.messages.map((m) => ({
//         role: m.role,
//         content: m.content,
//       })),
//       { role: 'user', content: userContent },
//     ];

//     // 4) فراخوانی Azure
//     const aiRes = await callAzureOpenAI(messages);

//     // 5) ذخیره پیام‌ها
//     conversation.productInfo = extracted;
//     if (userContent)
//       conversation.messages.push({ role: 'user', content: userContent });
//     if (aiRes.reply)
//       conversation.messages.push({ role: 'assistant', content: aiRes.reply });
//     conversation.updatedAt = new Date();
//     await conversation.save();

//     res.json({ extracted, ai: aiRes });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message || 'Server error' });
//   }
// });

// module.exports = router;

// routes/scrapeRouter.js
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const Conversation = require('../models/Conversation');

// // Azure
const AZURE_ENDPOINT = 'https://smarty-care-rag.openai.azure.com';
const AZURE_KEY =
  '6mptT2BZBCGdkA7YDRyzWifTeM4izRToBIGiDsL712ANn5wGVUcuJQQJ99BEACYeBjFXJ3w3AAABACOG2UP8';
const AZURE_DEPLOYMENT = 'gpt-4o-mini';
const AZURE_API_VERSION = '2025-01-01-preview';

/* -------- Helpers -------- */

// تبدیل اعداد فارسی به انگلیسی
function faToEnNumbers(str = '') {
  const map = {
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };
  return String(str).replace(/[۰-۹]/g, (d) => map[d]);
}

// حذف کاراکترهای غیر رقمی (به جز کاما و نقطه) و تبدیل به عدد
function normalizeNumberFromText(text = '') {
  if (!text) return null;
  let s = String(text);
  s = faToEnNumbers(s);
  // نگه داشتن ارقام و جداکننده های هزار (، , .)
  s = s.replace(/[^\d.,]/g, '');
  // حذف نقاط/کاما اضافی: تبدیل "1,699,000" -> "1699000"
  s = s.replace(/[,٬\u066C]/g, ''); // replace common comma-like
  s = s.replace(/\./g, ''); // اگر نقطه جداکننده هزار است
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatPriceFa(n) {
  try {
    // فارسی سازی اعداد با جداساز هزار
    return n.toLocaleString('fa-IR') + ' تومان';
  } catch (e) {
    return n.toLocaleString() + ' تومان';
  }
}

async function fetchRenderedHtml(pageUrl) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  // user agent to reduce bot blocking
  await page.setUserAgent(
    'Mozilla/5.0 (compatible; ProductScraper/1.0; +https://example.com/bot)'
  );
  await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  // small delay to allow lazy-loaded content
  await new Promise((r) => setTimeout(r, 1200));
  const html = await page.content();
  await browser.close();
  return html;
}

/* -- Deep extractor -- */
function extractFromHtml(html, baseUrl = '') {
  const $ = cheerio.load(html, { decodeEntities: false });

  // Title / headings
  const title =
    $('h1.product_title, h1, .product_title, .elementor-heading-title')
      .first()
      .text()
      .trim() || null;
  const headings = [];
  $('h1, h2, h3, .elementor-heading-title').each((i, el) => {
    const t = $(el).text().trim();
    if (t) headings.push(t);
  });

  // Description (tab-description preferred)
  let description = $(
    '#tab-description, .woocommerce-Tabs-panel--description, .product-description'
  )
    .first()
    .text()
    .trim();
  if (!description) {
    description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      null;
  }

  // Images (og:image + img tags)
  const images = new Set();
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) images.add(ogImage);
  $('img').each((i, el) => {
    let src =
      $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lzl-src');
    if (src && !src.startsWith('data:')) {
      try {
        src = new URL(src, baseUrl).href;
      } catch (e) {}
      images.add(src);
    }
  });

  // 색/رنگ‌ها: از swatches و <select name="attribute_pa_color"> و table.variations
  const colors = [];
  // 1) div swatches (wd-swatch)
  $('div.wd-swatch, .wd-swatch').each((i, el) => {
    const title =
      $(el).attr('data-title') ||
      $(el).find('.wd-swatch-text').text().trim() ||
      $(el).text().trim();
    if (title && !colors.includes(title)) colors.push(title);
  });
  // 2) select options in variations table
  $('table.variations select[name*="pa_color"] option').each((i, el) => {
    const t = $(el).text().trim();
    if (t && !/یک گزینه/i.test(t) && !colors.includes(t)) colors.push(t);
  });
  // 3) generic select
  $('select[id*="pa_color"] option, select[name*="color"] option').each(
    (i, el) => {
      const t = $(el).text().trim();
      if (t && !/یک گزینه/i.test(t) && !colors.includes(t)) colors.push(t);
    }
  );

  // سایزها
  const sizes = [];
  $('div[data-id*="pa_size"] .wd-swatch, div.wd-swatch[data-value]').each(
    (i, el) => {
      const v =
        $(el).attr('data-value') || $(el).find('.wd-swatch-text').text().trim();
      if (v && !sizes.includes(v)) sizes.push(v);
    }
  );
  $('table.variations select[name*="pa_size"] option').each((i, el) => {
    const t = $(el).text().trim();
    if (t && !/یک گزینه/i.test(t) && !sizes.includes(t)) sizes.push(t);
  });
  $('select[id*="pa_size"] option, select[name*="size"] option').each(
    (i, el) => {
      const t = $(el).text().trim();
      if (t && !/یک گزینه/i.test(t) && !sizes.includes(t)) sizes.push(t);
    }
  );

  // Features (ul li inside description or general)
  const features = [];
  $(
    '#tab-description ul li, .product-description ul li, ul.product-features li, ul.features li'
  ).each((i, el) => {
    const t = $(el).text().trim();
    if (t) features.push(t);
  });

  // installment / قسطی - try to capture a label and an amount
  let installmentText = null;
  function extractInstallment($) {
    const keywords = [
      'پرداخت اقساطی',
      'پرداخت اقساط',
      'قسط',
      'اقساط',
      'قسطی',
      'اسنپ پی',
    ];

    // 1) تمام عناصر ممکن را نگاه کن
    const selectors = [
      'p',
      'div',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      '.elementor-heading-title',
    ];

    for (const sel of selectors) {
      const elements = $(sel).toArray();

      for (const el of elements) {
        const text = $(el).text().trim();

        if (!text) continue;

        // اگر هر کلمه کلیدی داخل متن بود، قبولش کن
        if (keywords.some((k) => text.includes(k))) {
          return text;
        }
      }
    }

    // 2) fallback: جستجو در کل متن صفحه
    const bodyText = $('body').text();
    const regex =
      /(پرداخت اقساطی[^\.!\n]+|پرداخت اقساط[^\.!\n]+|قسط[^\.!\n]+|اسنپ پی[^\.!\n]+)/g;
    const match = bodyText.match(regex);

    return match ? match[0].trim() : null;
  }

  // rating & reviews
  const ratingText =
    $(
      '.aiosrs-rating .aiosrs-rating-count, .aiosrs-rating .aiosrs-rating, .rating'
    )
      .first()
      .text()
      .trim() || null;

  // video iframe (aparat)
  const video = $('iframe[src*="aparat.com"]').attr('src') || null;

  // Price: check common WooCommerce selectors and also dynamic fields inside elementor
  let priceNumber = null;
  const priceSelectors = [
    '.woocommerce-Price-amount',
    'p.price',
    '.price',
    '.jet-listing-dynamic-field__content',
    '.product-price',
    '.amount',
    'ins .amount',
    'del .amount',
  ];
  for (const sel of priceSelectors) {
    const el = $(sel).first();
    if (el && el.length) {
      const raw = el.text().trim();
      const num = normalizeNumberFromText(raw);
      if (num) {
        priceNumber = num;
        break;
      }
    }
  }
  // As fallback try to scan body text for large numbers (prefer > 1000)
  if (!priceNumber) {
    const bodyText = $('body').text();
    const priceRegex = /[۰-۹\d][\d۰-۹.,٬\u066C]{2,}/g; // long numbers
    const matches = (bodyText.match(priceRegex) || [])
      .map((s) => s.trim())
      .slice(0, 40);
    let candidates = [];
    for (const m of matches) {
      const n = normalizeNumberFromText(m);
      if (n && n > 1000) candidates.push(n);
    }
    if (candidates.length) {
      candidates = [...new Set(candidates)].sort((a, b) => b - a);
      priceNumber = candidates[0];
    }
  }

  const priceString = priceNumber ? formatPriceFa(priceNumber) : 'نامشخص';

  // Return structured object
  return {
    title: title || null,
    rawTitle: $('title').text().trim() || null,
    headings,
    description,
    features,
    images: Array.from(images).slice(0, 30),
    colors,
    sizes,
    priceNumber,
    priceString,
    installmentText,
    ratingText,
    video,
  };
}

/* -------- Azure OpenAI call (chat completions) -------- */
async function callAzureOpenAI(messages) {
  if (!AZURE_ENDPOINT || !AZURE_KEY || !AZURE_DEPLOYMENT) {
    return {
      error: 'Azure OpenAI config missing (set AZURE_OPENAI_* env vars).',
    };
  }

  const url = `${AZURE_ENDPOINT.replace(
    /\/$/,
    ''
  )}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
  const body = { messages, max_tokens: 900, temperature: 0.15 };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': AZURE_KEY },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { error: `Azure OpenAI error ${res.status}: ${txt}` };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || null;
    return { raw: data, reply };
  } catch (err) {
    return { error: String(err) };
  }
}

/* -------- API Route --------
 This route does:
 - render product page
 - extract rich product info
 - check availability of selected color/size (if provided)
 - include product info and availability into the system prompt
 - call Azure OpenAI with conversation history
 - save conversation and productInfo into MongoDB
*/
router.post('/', async (req, res) => {
  try {
    const { userId, url, userQuery, selectedColor, selectedSize } =
      req.body || {};
    if (!userId || !url)
      return res.status(400).json({ error: 'userId and url required' });

    // 1) Render + extract
    const html = await fetchRenderedHtml(url);
    const extracted = extractFromHtml(html, url);

    // 2) Prepare availability note (server-side)
    let availabilityNote = null;
    if (selectedColor || selectedSize) {
      const colorOk = selectedColor
        ? extracted.colors.some(
            (c) =>
              c && c.toLowerCase().includes((selectedColor + '').toLowerCase())
          )
        : true;
      const sizeOk = selectedSize
        ? extracted.sizes.some(
            (s) => s && (s + '').trim() === (selectedSize + '').trim()
          )
        : true;
      if (colorOk && sizeOk) {
        availabilityNote = `سرور: رنگ و سایز انتخاب شده (${
          selectedColor || '-'
        }, ${selectedSize || '-'}) در گزینه‌های محصول موجود به نظر می‌آید.`;
      } else {
        const missing = [];
        if (!colorOk) missing.push('رنگ');
        if (!sizeOk) missing.push('سایز');
        availabilityNote = `سرور: متاسفانه ${missing.join(
          ' و '
        )} انتخابی شما موجود نیست.`;
      }
    }

    // 3) Load or create conversation
    let conversation = await Conversation.findOne({ userId, productUrl: url });
    if (!conversation) {
      conversation = new Conversation({
        userId,
        productUrl: url,
        productInfo: extracted,
        messages: [],
      });
    } else {
      // ensure productInfo updated
      conversation.productInfo = extracted;
    }

    // 4) Build prompts/messages
    const systemPromptText = [
      'شما یک دستیار خرید هستید که به زبان فارسی به کاربر کمک می‌کنید.',
      'اطلاعات محصول را از داده‌های زیر استفاده کن و پاسخ‌ها را کوتاه، مفید و مکالمه‌ای بده.',
      'اگر اطلاعات کافی نیست، سوالی مشخص بپرس تا کاربر تکمیل کند (مثلاً سایز یا بودجه).',
      'در صورت موجود بودن رنگ/سایز، واضح اعلام کن و لینک/عکس/قیمت را ذکر کن.',
      'قیمت را مطابق داده‌ی موجود در productInfo نمایش بده.',
    ].join('\n');

    const productSummary = [
      `عنوان: ${extracted.title || extracted.rawTitle || 'نامشخص'}`,
      `قیمت: ${extracted.priceString || 'نامشخص'}`,
      extracted.colors && extracted.colors.length
        ? `رنگ‌ها: ${extracted.colors.join(', ')}`
        : 'رنگ‌ها: نامشخص',
      extracted.sizes && extracted.sizes.length
        ? `سایزها: ${extracted.sizes.join(', ')}`
        : 'سایزها: نامشخص',
      extracted.features && extracted.features.length
        ? `ویژگی‌ها: ${extracted.features.slice(0, 8).join('; ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt = {
      role: 'system',
      content: `${systemPromptText}\n\nProduct summary:\n${productSummary}`,
    };

    // restore conversation history but only role/content to avoid extra fields
    const historyMessages = (conversation.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // user content
    let userContent = (userQuery || '').trim();
    if (selectedColor) userContent += `\nSelected color: ${selectedColor}`;
    if (selectedSize) userContent += `\nSelected size: ${selectedSize}`;
    if (availabilityNote) userContent += `\n${availabilityNote}`;

    // Build final messages for the model
    const messages = [
      systemPrompt,
      ...historyMessages,
      { role: 'user', content: userContent || 'سلام' },
    ];

    // 5) Call Azure OpenAI
    const aiRes = await callAzureOpenAI(messages);

    // 6) Persist conversation
    if (userContent)
      conversation.messages.push({ role: 'user', content: userContent });
    if (aiRes.reply)
      conversation.messages.push({ role: 'assistant', content: aiRes.reply });
    conversation.productInfo = extracted;
    conversation.updatedAt = new Date();
    await conversation.save();

    // 7) respond
    return res.json({ extracted, ai: aiRes });
  } catch (err) {
    console.error('scrapeRouter error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
