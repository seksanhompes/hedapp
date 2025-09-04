// /api/stats/stock?from=YYYY-MM-DD&to=YYYY-MM-DD&type=all|nangfah|bod|khon|other
export async function onRequest({ env, request }) {
  const { DB } = env;
  const url = new URL(request.url);

  const from = url.searchParams.get('from') || '1970-01-01';
  const to   = url.searchParams.get('to')   || '2999-12-31';
  const type = (url.searchParams.get('type') || 'all').toLowerCase();

  const typeFilter = type === 'all' ? '' : 'AND LOWER(COALESCE(type, mushroom_type)) = ?';
  const bindCommon = [from, to];
  const bindType   = type === 'all' ? [] : [type];

  try {
    // รวม "เก็บ" ตามช่วงวัน
    const hRes = await DB.prepare(
      `SELECT LOWER(COALESCE(type, mushroom_type)) AS t,
              SUM(COALESCE(weight, weight_kg, 0)) AS harvest_weight
         FROM harvest
        WHERE date BETWEEN ? AND ?
        ${typeFilter}
        GROUP BY ${type === 'all' ? 't' : '1'}`
    ).bind(...bindCommon, ...bindType).all();
    const hRows = hRes.results || [];

    // รวม "ขาย" ตามช่วงวัน
    const sRes = await DB.prepare(
      `SELECT LOWER(COALESCE(type, mushroom_type)) AS t,
              SUM(COALESCE(weight, weight_kg, 0)) AS sales_weight
         FROM sales
        WHERE date BETWEEN ? AND ?
        ${typeFilter}
        GROUP BY ${type === 'all' ? 't' : '1'}`
    ).bind(...bindCommon, ...bindType).all();
    const sRows = sRes.results || [];

    const mapH = Object.create(null);
    hRows.forEach(r => mapH[r.t || 'other'] = Number(r.harvest_weight || 0));

    const mapS = Object.create(null);
    sRows.forEach(r => mapS[r.t || 'other'] = Number(r.sales_weight || 0));

    // รวมแบบ all types
    if (type === 'all') {
      const allTypes = new Set([...Object.keys(mapH), ...Object.keys(mapS)]);
      const by_type = [...allTypes].map(t => {
        const h = mapH[t] || 0;
        const s = mapS[t] || 0;
        return {
          t,
          harvest_weight: h,
          sales_weight: s,
          remain_weight: h - s
        };
      }).sort((a,b) => a.t.localeCompare(b.t));

      const totals = by_type.reduce((acc, r) => {
        acc.harvest_weight += r.harvest_weight;
        acc.sales_weight   += r.sales_weight;
        acc.remain_weight  += r.remain_weight;
        return acc;
      }, { harvest_weight:0, sales_weight:0, remain_weight:0 });

      return json({ ok:true, from, to, type, totals, by_type });
    }

    // กรณีเลือกชนิดเดียว
    const t = type;
    const h = mapH[t] || 0;
    const s = mapS[t] || 0;
    const totals = { harvest_weight: h, sales_weight: s, remain_weight: h - s };
    return json({ ok:true, from, to, type, totals });
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500);
  }

  function json(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
          }
