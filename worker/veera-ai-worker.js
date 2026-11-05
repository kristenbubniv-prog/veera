// Veera AI — Cloudflare Worker (free tier, Workers AI).
// Paste this into a new Worker, add an AI binding named "AI", deploy.
// The page sends {prompt}; the Worker returns {text} — the model's JSON answer as a string.

const ALLOWED = [
  'https://kristenbubniv-prog.github.io', // the demo site
  'http://localhost:8765'                 // local testing
];
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const ok = ALLOWED.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST' || !ok) return new Response('Forbidden', { status: 403, headers: cors });

    let prompt = '';
    try { prompt = String((await request.json()).prompt || '').slice(0, 6000); } catch (e) {}
    if (!prompt) return new Response('Bad request', { status: 400, headers: cors });

    try {
      const out = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: 'You are a role-play partner in an English speaking practice app for people who work in the UK. Answer with one JSON object only, no other text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.6
      });
      const text = typeof out.response === 'string' ? out.response : JSON.stringify(out.response);
      return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'ai_failed' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  }
};
