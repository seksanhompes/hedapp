import { ensureSchema, corsHeaders, json } from '../_lib/schema.js';

export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  try {
    await ensureSchema(env.DB);
    const tables = ['harvest','sales','production','blooming','finance'];
    const counts = {};
    for (const t of tables) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).all();
      counts[t] = row.results?.[0]?.n || 0;
    }
    return json({ ok: true, counts }, { headers });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500, headers });
  }
}
