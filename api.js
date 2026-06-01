// api.js — Anthropic API wrapper and parsing helpers

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

function getEndpoint() {
  const proto = window.location.protocol;
  const host  = window.location.hostname;

  // Direct call only works inside claude.ai (CORS allowlisted by Anthropic)
  if (host === 'claude.ai' || host.endsWith('.claude.ai')) {
    return { url: 'https://api.anthropic.com/v1/messages', direct: true };
  }

  // Every other host (Netlify, GitHub Pages, localhost, file://) — use the proxy function
  return { url: '/.netlify/functions/proxy', direct: false };
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

  const { url, direct } = getEndpoint();

  const headers = {
    'Content-Type':      'application/json',
    'x-api-key':         key,
    'anthropic-version': '2023-06-01',
  };
  if (direct) {
    headers['anthropic-dangerous-direct-browser-calls'] = 'true';
  }

  let res;
  try {
    res = await fetch(url, {
      method:  'POST',
      headers: headers,
      body:    JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(
      'Network error — could not reach the API. ' +
      'Make sure the site is deployed via Netlify (not drag-and-drop; needs a connected GitHub repo). ' +
      'Error: ' + networkErr.message
    );
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
