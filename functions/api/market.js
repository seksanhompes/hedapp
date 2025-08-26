// functions/api/market.js
export async function onRequest({ env }) {
  try {
    const url = env.PRICES_CSV_URL;
    if (!url) {
      return Response.json({ ok: false, error: 'Missing PRICES_CSV_URL' }, { status: 500 });
    }

    // ดึง CSV
    const r = await fetch(url, { cf: { cacheTtl: 60 } });
    if (!r.ok) return Response.json({ ok: false, error: 'fetch CSV failed: ' + r.status });

    const text = (await r.text()).trim();
    const rows = parseCSV(text);
    if (!rows.length) return Response.json({ ok: false, error: 'empty CSV' });

    const head = rows[0].map(s => s.trim().toLowerCase());
    const idx = (k) => head.indexOf(k);
    const typeI = idx('type'), lowI = idx('low'), highI = idx('high'), areaI = idx('area'), updI = idx('updated_at');
    if ([typeI, lowI, highI, areaI, updI].some(i => i < 0)) {
      return Response.json({ ok: false, error: 'CSV header must be: type,low,high,area,updated_at' }, { status: 400 });
    }

    const items = rows.slice(1).filter(r => r.length).map(r => ({
      type: r[typeI]?.trim(),
      low: Number(r[lowI] || 0),
      high: Number(r[highI] || 0),
      area: r[areaI]?.trim(),
      updated_at: r[updI]?.trim(),
      avg: (Number(r[lowI] || 0) + Number(r[highI] || 0)) / 2
    }));

    return new Response(JSON.stringify({ ok: true, items }, null, 2), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    });

  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/* CSV parser ง่าย ๆ */
function parseCSV(text) {
  const out = [], row = []; let cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); out.push(row.splice(0)); cur = ''; }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); out.push(row); }
  return out;
}
