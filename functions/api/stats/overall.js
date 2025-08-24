import { ensureSchema, corsHeaders, json } from '../../_lib/schema.js';

export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  await ensureSchema(env.DB);

  const [h, s, p, b] = await Promise.all([
    env.DB.prepare(`SELECT type, SUM(weight) AS kg FROM harvest GROUP BY type`).all(),
    env.DB.prepare(`SELECT type, SUM(weight * price) AS baht FROM sales GROUP BY type`).all(),
    env.DB.prepare(`SELECT type, SUM(amount) AS count FROM production GROUP BY type`).all(),
    env.DB.prepare(`SELECT type, SUM(amount) AS count FROM blooming GROUP BY type`).all(),
  ]);

  const sum = (arr, key) => (arr?.results || []).reduce((a,x)=>a+(x[key]||0),0);

  return json({
    harvest: h.results || [],
    sales: s.results || [],
    production: p.results || [],
    blooming: b.results || [],
    totals: {
      kg: sum(h, 'kg'),
      baht: sum(s, 'baht'),
      produced: sum(p, 'count'),
      opened: sum(b, 'count'),
    }
  }, { headers });
}
