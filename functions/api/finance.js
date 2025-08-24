import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  await ensureSchema(env.DB);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT id, date, kind, amount, description
       FROM finance ORDER BY date DESC, id DESC LIMIT 200`
    ).all();
    return json(results, { headers });
  }

  if (request.method === 'POST') {
    const { date, kind, amount, description } = await request.json();
    if (!date || !kind || typeof amount !== 'number' || !description) {
      return json({ ok: false, error: 'invalid payload' }, { status: 400, headers });
    }
    await env.DB.prepare('INSERT INTO finance(date, kind, amount, description) VALUES (?1, ?2, ?3, ?4)')
      .bind(date, kind, amount, description).run();
    return json({ ok: true }, { headers });
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}
