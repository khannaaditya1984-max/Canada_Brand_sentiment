// api.js — Anthropic API wrapper and parsing helpers

function getApiKey() {
  return document.getElementById('apiKey').value.trim();
}

// Use the Netlify proxy when deployed; direct call only works inside claude.ai
function getEndpoint() {
  const host = window.location.hostname;
  const isClaudeAI = host.includes('claude.ai');
  const isLocalFile = window.location.protocol === 'file:';
  if (isClaudeAI || isLocalFile) {
    // claude.ai allows direct calls with the dangerous header
    // file:// we still try direct (will fail on CORS but gives a clear error)
    return { url: 'https://api.anthropic.com/v1/messages', direct: true };
  }
  // Netlify, GitHub Pages, any other host — use the proxy
  return { url: '/api/proxy', direct: false };
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
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  };
  if (direct) {
    headers['anthropic-dangerous-direct-browser-calls'] = 'true';
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    throw new Error(
      'Network error — could not reach the API. ' +
      'If running locally, open via a local server (e.g. npx serve .) rather than double-clicking the file. ' +
      'Original error: ' + networkErr.message
    );
  }

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
