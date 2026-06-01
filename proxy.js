// netlify/functions/proxy.js
// Proxies requests to the Anthropic API server-side, avoiding CORS.
// The API key is passed from the client in the x-api-key header.

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: { message: 'Missing x-api-key header' } }),
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: event.body,
    });

    const data = await response.text();
    return {
      statusCode: response.status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: data,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }),
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
