// api.js — Anthropic API wrapper and parsing helpers

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

async function callClaude(messages, tools, maxTokens) {
  const key = getApiKey();
  if (!key) throw new Error('No API key provided. Enter your Anthropic API key in the sidebar.');

  const body = {
    model: MODEL,
    max_tokens: maxTokens || MAX_TOKENS_DEFAULT,
    messages,
  };
  if (tools) body.tools = tools;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || 'API error ' + res.status);
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
  } catch {
    return null;
  }
}

function safeParseArr(txt) {
  try {
    const clean = txt.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('[');
    const e = clean.lastIndexOf(']');
    if (s < 0 || e < 0) return null;
    return JSON.parse(clean.slice(s, e + 1));
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
