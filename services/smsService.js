const axios = require('axios');

async function sendOtp(bodyId, to, variables) {
  const username = '9122270114';
  const password = '8!9HP';

  const varsArray = Array.isArray(variables) ? variables : [variables];
  const textStrings = varsArray.map((v) => `<string>${v}</string>`).join('');

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendByBaseNumber xmlns="http://tempuri.org/">
      <username>${username}</username>
      <password>${password}</password>
      <text>
        ${textStrings}
      </text>
      <to>${to}</to>
      <bodyId>${bodyId}</bodyId>
    </SendByBaseNumber>
  </soap:Body>
</soap:Envelope>`;

  try {
    const { data } = await axios.post(
      'http://api.payamak-panel.com/post/send.asmx',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept-Charset': 'utf-8',
        },
      }
    );

    console.log('📨 پاسخ SOAP خام:', data);
    const match = data.match(
      /<SendByBaseNumberResult>(.*?)<\/SendByBaseNumberResult>/
    );
    const result = match ? match[1] : null;

    if (result && !isNaN(result) && result.length > 10) {
      console.log('✅ ارسال موفق. کد رهگیری:', result);
      return { success: true, messageId: result };
    } else {
      console.log('❌ ارسال ناموفق. کد خطا:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ خطای سیستمی:', error);
    return { success: false, error };
  }
}

module.exports = { sendOtp };
