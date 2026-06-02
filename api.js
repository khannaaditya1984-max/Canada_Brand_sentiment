// api.js — routes all calls through the Cloudflare Worker proxy
// Replace YOUR-SUBDOMAIN below with your actual Cloudflare Worker subdomain

const PROXY_URL = 'https://shy-dawn-e509sentiment-proxy.khanna-aditya1984.workers.dev';

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

async function callClaude(messages, tools, maxTokens) {
  const key = getApiKey();
  if (!key) throw new Error('No API key provided. Enter your Anthropic API key in the sidebar.');

  const body = {
    model:      MODEL,
    max_tokens: maxTokens || MAX_TOKENS_DEFAULT,
    messages,
  };
  if (tools) body.tools = tools;

  let res;
  try {
    res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    key,
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error('Network error — check your Cloudflare Worker is deployed: ' + networkErr.message);
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody.error && errBody.error.message) || 'API error ' + res.status);
  }
  return res.json();
}

function extractText(data) {
  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
}

function safeParse(txt) {
  try {
    const clean = txt.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('{');
    const e = clean.lastIndexOf('}');
    if (s < 0 || e < 0) return null;
    return JSON.parse(clean.slice(s, e + 1));
  } catch { return null; }
}

function safeParseArr(txt) {
  try {
    const clean = txt.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('[');
    const e = clean.lastIndexOf(']');
    if (s < 0 || e < 0) return null;
    return JSON.parse(clean.slice(s, e + 1));
  } catch { return null; }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
