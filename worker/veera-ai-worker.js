// Veera AI — Cloudflare Worker (free tier, Workers AI).
// Setup: paste this into the Worker "veera-ai", add a Workers AI binding named "AI", deploy.
// Check: open https://veera-ai.<your-subdomain>.workers.dev/health — it should say "ok": true.
// The page sends {prompt}; the Worker returns {text, model} — the model's JSON answer as a string.

const ALLOWED = [
  'https://kristenbubniv-prog.github.io', // the demo site
  'http://localhost:8765'                 // local testing
];
// Tried in order — if a model is unavailable or retired, the next one answers.
const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/google/gemma-3-12b-it'
];
const SYSTEM = 'You are a role-play partner in an English speaking practice app for people who work in the UK. Answer with one JSON object only, no other text.';

function textOf(out) {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out.response === 'string') return out.response;
  if (out.response && typeof out.response === 'object') return JSON.stringify(out.response);
  if (out.choices && out.choices[0]) return (out.choices[0].message && out.choices[0].message.content) || out.choices[0].text || '';
  if (out.result) return textOf(out.result);
  return '';
}

async function ask(env, prompt) {
  const errors = [];
  for (const model of MODELS) {
    try {
      const out = await env.AI.run(model, {
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6
      });
      const text = textOf(out).trim();
      if (text) return { text, model };
      errors.push(model + ': empty');
    } catch (e) {
      errors.push(model + ': ' + String(e && e.message || e).slice(0, 120));
    }
  }
  return { error: 'all_models_failed', details: errors };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { ...headers, 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const ok = ALLOWED.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Health check you can open in a browser: shows whether the AI binding works.
    if (request.method === 'GET' && url.pathname === '/health') {
      if (!env.AI) return json({ ok: false, problem: 'No Workers AI binding. Settings → Bindings → Add → Workers AI, name it AI.' }, 200, cors);
      const r = await ask(env, 'Return JSON {"reply": "OK"}');
      return json(r.text ? { ok: true, model: r.model, sample: r.text.slice(0, 80) } : { ok: false, problem: r.error, details: r.details }, 200, cors);
    }

    if (request.method !== 'POST' || !ok) return new Response('Forbidden', { status: 403, headers: cors });
    if (!env.AI) return json({ error: 'no_ai_binding' }, 500, cors);

    let prompt = '';
    try { prompt = String((await request.json()).prompt || '').slice(0, 6000); } catch (e) {}
    if (!prompt) return json({ error: 'bad_request' }, 400, cors);

    const r = await ask(env, prompt);
    return r.text ? json({ text: r.text, model: r.model }, 200, cors) : json(r, 502, cors);
  }
};
