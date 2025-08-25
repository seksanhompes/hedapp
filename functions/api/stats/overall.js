import { ensureSchema, corsHeaders, json } from '../../_lib/schema.js';
export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  if (!env.DB) return json({ ok:false, error:"D1 binding 'DB' missing" }, { status:500, headers });

  try {
    await ensureSchema(env.DB);

    const [h,s,p,b] = await Promise.all([
      env.DB.prepare(`SELECT type, SUM(weight) AS kg FROM harvest GROUP BY type`).all(),
      env.DB.prepare(`SELECT type, SUM(weight*price) AS baht FROM sales GROUP BY type`).all(),
      env.DB.prepare(`SELECT type, SUM(amount) AS count FROM production GROUP BY type`).all(),
      env.DB.prepare(`SELECT type, SUM(amount) AS count FROM blooming GROUP BY type`).all(),
    ]);

    const sum = (res, key) => (res?.results || []).reduce((a,x)=>a+(x[key]||0),0);

    return json({
      ok:true,
      harvest:    h.results || [],
      sales:      s.results || [],
      production: p.results || [],
      blooming:   b.results || [],
      totals: {
        kg: sum(h,'kg'),
        baht: sum(s,'baht'),
        produced: sum(p,'count'),
        opened: sum(b,'count'),
      }
    }, { headers });
  } catch (e) {
    return json({ ok:false, error:String(e) }, { status:500, headers });
  }
}
