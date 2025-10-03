// services/azureAgent.js
const axios = require('axios');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://your-resource.openai.azure.com
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT; // model deployment name

if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY || !AZURE_DEPLOYMENT) {
  console.warn(
    'Azure OpenAI env not set - azureAgent will fail without proper envs'
  );
}

async function parseUserMessageToIntent(text, chatContext = {}) {
  // craft instruction prompt that asks for strict JSON (no extra text)
  const systemPrompt = `
You are an assistant that extracts reservation intents for a Persian beauty salon reservation system.
Given a user's Persian message, return ONLY a strict JSON object (no explanation) with exactly these fields:
{
  "intent": "reservation" | "feedback" | "other",
  "service": string or null,            // service name in Persian if recognized, otherwise null
  "operator_name": string or null,      // employee name if provided
  "preferred_datetime": string or null, // ISO8601 datetime in UTC if user provided; otherwise null
  "reply": string                       // a short Persian reply to the user to continue the flow
}

If user asks to give feedback, set intent to "feedback" and provide a short Persian reply asking for details.
If user says "سلام" or ambiguous greeting, set intent "other" and provide a friendly Persian greeting in reply.
If date/time is vague (e.g. "صبح پنجشنبه"), try to return an ISO with timezone UTC if possible; if impossible, return null.
Be strict: output only the JSON object.
User message:
"""${text}"""
`;

  // Azure OpenAI REST API (completions or chat completions depending on deployment)
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2023-10-01-preview`;

  const payload = {
    messages: [{ role: 'system', content: systemPrompt }],
    max_tokens: 400,
    temperature: 0.1,
  };

  const headers = {
    'api-key': AZURE_OPENAI_KEY,
    'Content-Type': 'application/json',
  };

  try {
    const resp = await axios.post(url, payload, { headers });
    // The response structure depends on your Azure setup; often: resp.data.choices[0].message.content
    const content =
      resp.data.choices?.[0]?.message?.content ||
      resp.data.choices?.[0]?.text ||
      '';
    // Try parse JSON
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (err) {
      // Fallback: try to extract JSON substring
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = content.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }
      throw new Error('Could not parse JSON from Azure response: ' + content);
    }
  } catch (e) {
    console.error('Azure OpenAI error', e?.response?.data || e.message);
    throw e;
  }
}

module.exports = { parseUserMessageToIntent };
