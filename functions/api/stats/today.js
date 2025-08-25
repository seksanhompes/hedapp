import { ensureSchema, corsHeaders, json } from '../../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  if (!env.DB) return json({ ok:false, error:"D1 binding 'DB' missing" }, { status:500, headers });

  try {
    await ensureSchema(env.DB);

    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const h = await env.DB.prepare(
      `SELECT type, SUM(weight) AS kg FROM harvest WHERE date=?1 GROUP BY type`
    ).bind(date).all();

    const s = await env.DB.prepare(
      `SELECT type, SUM(weight*price) AS baht FROM sales WHERE date=?1 GROUP BY type`
    ).bind(date).all();

    const b = await env.DB.prepare(
      `SELECT type, SUM(amount) AS count FROM blooming WHERE date=?1 GROUP BY type`
    ).bind(date).all();

    const sum = (rows, k) => (rows?.results||[]).reduce((a,x)=>a+(x[k]||0),0);

    return json({
      ok:true,
      date,
      harvest: h.results || [],
      sales:   s.results || [],
      blooming:b.results || [],
      totals: { kg: sum(h,'kg'), baht: sum(s,'baht'), blooming: sum(b,'count') }
    }, { headers });
  } catch (e) {
    return json({ ok:false, error:String(e) }, { status:500, headers });
  }
}
