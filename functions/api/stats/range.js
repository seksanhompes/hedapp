// สรุปตามช่วงวันที่ + ชนิดเห็ด
export async function onRequest({ env, request }) {
  const { DB } = env;
  const url = new URL(request.url);

  const from = url.searchParams.get('from') || '1970-01-01';
  const to   = url.searchParams.get('to')   || '2999-12-31';
  const type = (url.searchParams.get('type') || 'all').toLowerCase(); // all | nangfah | bod | khon | other

  const typeFilter = type === 'all' ? '' : 'AND LOWER(COALESCE(type, mushroom_type)) = ?';
  const bindCommon = [from, to];
  const bindType   = type === 'all' ? [] : [type];

  try {
    // เก็บเห็ด (น้ำหนักรวม)
    const hRes = await DB.prepare(
      `SELECT COALESCE(type, mushroom_type) AS t,
              SUM(COALESCE(weight, weight_kg, 0)) AS weight
         FROM harvest
        WHERE date BETWEEN ? AND ?
        ${typeFilter}
        GROUP BY ${type === 'all' ? 't' : '1'}`
    ).bind(...bindCommon, ...bindType).all();
    const hRows = hRes.results || [];

    // ขายเห็ด (น้ำหนัก + ยอดเงิน)
    const sRes = await DB.prepare(
      `SELECT COALESCE(type, mushroom_type) AS t,
              SUM(COALESCE(weight, weight_kg, 0)) AS sales_weight,
              SUM(
                COALESCE(total, total_amount,
                         COALESCE(weight, weight_kg, 0) * COALESCE(price, price_per_kg, 0))
              ) AS sales_amount
         FROM sales
        WHERE date BETWEEN ? AND ?
        ${typeFilter}
        GROUP BY ${type === 'all' ? 't' : '1'}`
    ).bind(...bindCommon, ...bindType).all();
    const sRows = sRes.results || [];

    // ผลิตก้อน
    const pRow = (await DB.prepare(
      `SELECT SUM(COALESCE(amount, quantity, 0)) AS amount
         FROM production
        WHERE date BETWEEN ? AND ?
        ${typeFilter}`
    ).bind(...bindCommon, ...bindType).first()) || { amount: 0 };

    // เปิดดอก
    const bRow = (await DB.prepare(
      `SELECT SUM(COALESCE(amount, quantity, 0)) AS amount
         FROM blooming
        WHERE date BETWEEN ? AND ?
        ${typeFilter}`
    ).bind(...bindCommon, ...bindType).first()) || { amount: 0 };

    // รวมผล
    const harvest_weight = hRows.reduce((a, r) => a + (r.weight || 0), 0);
    const sales_weight   = sRows.reduce((a, r) => a + (r.sales_weight || 0), 0);
    const sales_amount   = sRows.reduce((a, r) => a + (r.sales_amount || 0), 0);
    const totals = {
      harvest_weight,
      sales_weight,
      sales_amount,
      avg_price: sales_weight > 0 ? sales_amount / sales_weight : 0,
      production_blocks: Number(pRow.amount || 0),
      blooming_blocks: Number(bRow.amount || 0),
    };

    // รายการแยกตามชนิด (ไว้ใช้ตอนเลือก type=all)
    let by_type = null;
    if (type === 'all') {
      const map = {};
      sRows.forEach(r => {
        const t = (r.t || 'other').toLowerCase();
        if (!map[t]) map[t] = { t, sales_weight: 0, sales_amount: 0 };
        map[t].sales_weight += r.sales_weight || 0;
        map[t].sales_amount += r.sales_amount || 0;
      });
      by_type = Object.values(map);
    }

    return new Response(JSON.stringify({ ok: true, from, to, type, totals, by_type }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
