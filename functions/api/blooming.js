import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  if (!env.DB) return json({ ok:false, error:"D1 binding 'DB' missing" }, { status:500, headers });

  try {
    await ensureSchema(env.DB);

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, date, type, amount FROM blooming ORDER BY date DESC, id DESC LIMIT 200'
      ).all();
      return json(results, { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const date = body.date;
      const type = body.type;
      const amount = Number.parseInt(body.amount, 10);
      if (!date || !type || !Number.isFinite(amount)) {
        return json({ ok:false, error:'invalid payload' }, { status:400, headers });
      }
      await env.DB.prepare('INSERT INTO blooming(date,type,amount) VALUES (?1,?2,?3)')
        .bind(date, type, amount).run();
      return json({ ok:true }, { headers });
    }

    return new Response('Method Not Allowed', { status:405, headers });
  } catch (e) {
    return json({ ok:false, error:String(e) }, { status:500, headers });
  }
}
