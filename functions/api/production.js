import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  await ensureSchema(env.DB);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, date, type, amount FROM production ORDER BY date DESC, id DESC LIMIT 200'
    ).all();
    return json(results, { headers });
  }

  if (request.method === 'POST') {
    const { date, type, amount } = await request.json();
    if (!date || !type || typeof amount !== 'number') {
      return json({ ok: false, error: 'invalid payload' }, { status: 400, headers });
    }
    await env.DB.prepare('INSERT INTO production(date, type, amount) VALUES (?1, ?2, ?3)')
      .bind(date, type, amount).run();
    return json({ ok: true }, { headers });
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}

