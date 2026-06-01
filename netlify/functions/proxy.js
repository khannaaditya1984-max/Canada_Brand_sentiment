// netlify/functions/proxy.js
// Server-side proxy to Anthropic API — avoids CORS restrictions in the browser.

exports.handler = async function (event, context) {

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: { message: 'Method not allowed' } }),
    };
  }

  // Pull the API key the client passed through
  const apiKey = (event.headers['x-api-key'] || '').trim();
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: { message: 'Missing x-api-key header' } }),
    };
  }

  // Forward to Anthropic
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: event.body,
    });
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: { message: 'Upstream fetch failed: ' + err.message } }),
    };
  }

  const responseText = await response.text();

  return {
    statusCode: response.status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
    },
    body: responseText,
  };
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
