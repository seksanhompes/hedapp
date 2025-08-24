import { ensureSchema, corsHeaders, json } from '../../_lib/schema.js';

export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  await ensureSchema(env.DB);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

  // harvest: kg per type
  const h = await env.DB.prepare(
    `SELECT type, SUM(weight) AS kg FROM harvest WHERE date = ?1 GROUP BY type`
  ).bind(date).all();

  // sales: baht per type
  const s = await env.DB.prepare(
    `SELECT type, SUM(weight * price) AS baht FROM sales WHERE date = ?1 GROUP BY type`
  ).bind(date).all();

  // blooming: count per type
  const b = await env.DB.prepare(
    `SELECT type, SUM(amount) AS count FROM blooming WHERE date = ?1 GROUP BY type`
  ).bind(date).all();

  // totals
  const totalKg = (h.results||[]).reduce((a,x)=>a+(x.kg||0),0);
  const totalBaht = (s.results||[]).reduce((a,x)=>a+(x.baht||0),0);
  const totalBloom = (b.results||[]).reduce((a,x)=>a+(x.count||0),0);

  return json({
    date,
    harvest: h.results || [],
    sales: s.results || [],
    blooming: b.results || [],
    totals: { kg: totalKg, baht: totalBaht, blooming: totalBloom }
  }, { headers });
}
