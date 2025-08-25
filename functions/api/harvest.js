import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  if (!env.DB) return json({ ok:false, error:"D1 binding 'DB' missing" }, { status:500, headers });

  try {
    await ensureSchema(env.DB);

    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, date, type, weight FROM harvest ORDER BY date DESC, id DESC LIMIT 200'
      ).all();
      return json(results, { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const date = body.date;
      const type = body.type;
      const weight = Number(body.weight);
      if (!date || !type || !Number.isFinite(weight)) {
        return json({ ok:false, error:'invalid payload' }, { status:400, headers });
      }
      await env.DB.prepare('INSERT INTO harvest(date,type,weight) VALUES (?1,?2,?3)')
        .bind(date, type, weight).run();
      return json({ ok:true }, { headers });
    }

    return new Response('Method Not Allowed', { status:405, headers });
  } catch (e) {
    return json({ ok:false, error:String(e) }, { status:500, headers });
  }
}
