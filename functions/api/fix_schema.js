import { ensureSchema, corsHeaders, json } from '../../_lib/schema.js';

export const onRequestOptions = ({ request }) =>
  new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  if (!env.DB) return json({ ok:false, error:"D1 binding 'DB' missing" }, { status:500, headers });

  try {
    // สร้างตารางพื้นฐานก่อน (ถ้ายังไม่มี)
    await ensureSchema(env.DB);

    // helper: เช็กว่าตารางมีคอลัมน์หรือยัง
    async function hasCol(table, col) {
      const r = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
      const cols = (r.results || []).map(x => (x.name || '').toLowerCase());
      return cols.includes(col.toLowerCase());
    }

    const added = {};

    // เพิ่มคอลัมน์ type ให้ตารางที่ขาด
    if (!(await hasCol('sales','type'))) {
      await env.DB.prepare(`ALTER TABLE sales ADD COLUMN type TEXT NOT NULL DEFAULT 'other'`).run();
      added.sales_type = true;
    }
    if (!(await hasCol('production','type'))) {
      await env.DB.prepare(`ALTER TABLE production ADD COLUMN type TEXT NOT NULL DEFAULT 'other'`).run();
      added.production_type = true;
    }
    if (!(await hasCol('blooming','type'))) {
      await env.DB.prepare(`ALTER TABLE blooming ADD COLUMN type TEXT NOT NULL DEFAULT 'other'`).run();
      added.blooming_type = true;
    }

    // รายงานผลรวมหลังซ่อม
    const tables = ['harvest','sales','production','blooming','finance'];
    const counts = {};
    for (const t of tables) {
      const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).all();
      counts[t] = r.results?.[0]?.n ?? 0;
    }

    return json({ ok:true, added, counts }, { headers });
  } catch (e) {
    return json({ ok:false, error:String(e) }, { status:500, headers });
  }
}
