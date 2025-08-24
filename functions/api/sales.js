import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';

export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  await ensureSchema(env.DB);

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, date, type, weight, price, (weight*price) AS total FROM sales ORDER BY date DESC, id DESC LIMIT 200'
    ).all();
    return json(results, { headers });
  }

  if (request.method === 'POST') {
    const { date, type, weight, price } = await request.json();
    if (!date || !type || typeof weight !== 'number' || typeof price !== 'number') {
      return json({ ok: false, error: 'invalid payload' }, { status: 400, headers });
    }
    await env.DB.prepare('INSERT INTO sales(date, type, weight, price) VALUES (?1, ?2, ?3, ?4)')
      .bind(date, type, weight, price).run();
    return json({ ok: true }, { headers });
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}
