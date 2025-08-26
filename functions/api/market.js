// functions/api/market.js
export async function onRequest({ env }) {
  try {
    const csvUrl = env.MARKET_CSV_URL;
    if (!csvUrl) {
      return json({ ok: false, error: "Missing MARKET_CSV_URL" }, 500);
    }

    // ดึง CSV จาก Google
    const r = await fetch(csvUrl, { cf: { cacheTtl: 60 } });
    if (!r.ok) return json({ ok: false, error: `fetch CSV failed: ${r.status}` }, 500);

    const text = (await r.text()).trim();
    const rows = parseCSV(text);

    if (!rows.length) return json({ ok: true, updated_at: null, items: [] });

    // หา index จาก header
    const head = rows[0].map(s => s.trim().toLowerCase());
    const idx = (k) => head.indexOf(k);

    const iType = idx('type'),
          iLow  = idx('low'),
          iHigh = idx('high'),
          iArea = idx('area'),
          iUpd  = idx('updated_at');

    if ([iType,iLow,iHigh,iArea,iUpd].some(v => v < 0)) {
      return json({ ok: false, error: "CSV header must be: type,low,high,area,updated_at" }, 500);
    }

    let updated_at = null;
    const items = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r.length) continue;

      const type = (r[iType] || '').trim().toLowerCase();
      const low  = parseFloat(r[iLow]  || '0');
      const high = parseFloat(r[iHigh] || '0');
      const area = (r[iArea] || '').trim();
      const upd  = (r[iUpd] || '').trim();
      const avg  = (low + high) / 2;

      items.push({ type, low, high, avg, area });
      if (upd && !updated_at) updated_at = upd; // เก็บ updated_at ของแถวแรกที่เจอ
    }

    // ตั้งค่า cache header ให้ CDN แคช 60 วินาที
    return json({ ok: true, updated_at, items }, 200, { 'Cache-Control': 'public, max-age=60' });

  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// ส่ง JSON ช่วยให้เขียนสั้น ๆ
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

/* CSV parser แบบง่าย รองรับเครื่องหมายคำพูด/คอมมา */
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];

    if (inQ) {
      if (c === '"' && n === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (row.length || cur !== '') { row.push(cur); rows.push(row); }
        // reset row
        row = []; cur = '';
        // กิน \r\n ที่มาติดกัน
        if (c === '\r' && n === '\n') i++;
      } else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
