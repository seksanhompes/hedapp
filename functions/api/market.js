// functions/api/market.js
function cors() { return {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'
};}
export const onRequestOptions = () => new Response(null, { headers: cors() });

export async function onRequest({ env, request }) {
  const headers = { 'Content-Type':'application/json', ...cors() };
  try {
    if (!env.PRICES_CSV_URL) {
      return new Response(JSON.stringify({ ok:false, error:'Missing PRICES_CSV_URL' }), { status:500, headers });
    }
    // edge cache 30 นาที
    const cache = caches.default;
    const key = new Request(new URL(request.url), request);
    const cached = await cache.match(key);
    if (cached) return cached;

    const r = await fetch(env.PRICES_CSV_URL, { cf:{ cacheTtl:0 }});
    if (!r.ok) throw new Error('Fetch CSV failed: '+r.status);
    const csv = (await r.text()).trim();

    const rows = parseCSV(csv);
    const head = rows[0].map(s => s.trim().toLowerCase());
    const idx = n => head.indexOf(n);
    const I = { type:idx('type'), low:idx('low'), high:idx('high'), area:idx('area'), updated_at:idx('updated_at') };
    if (Object.values(I).some(v => v < 0)) throw new Error('CSV header must be: type,low,high,area,updated_at');

    const items = [];
    let updated_at = null;
    for (let i=1;i<rows.length;i++){
      const r = rows[i]; if (!r.length) continue;
      const type = (r[I.type]||'other').trim().toLowerCase();
      const low  = parseFloat(r[I.low]  || '0');
      const high = parseFloat(r[I.high] || r[I.low] || '0');
      const area = r[I.area] || '';
      const avg  = (low + high) / 2;
      items.push({ type, low, high, avg, area });
      if (!updated_at && r[I.updated_at]) updated_at = r[I.updated_at];
    }

    const resp = new Response(JSON.stringify({ ok:true, source:'Google Sheets', updated_at, items }), { headers });
    resp.headers.set('Cache-Control','public, max-age=1800'); // 30 นาที
    await cache.put(key, resp.clone());
    return resp;
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:500, headers });
  }
}

// CSV parser รองรับช่องที่มีเครื่องหมายคำพูด/คอมมา
function parseCSV(text){
  const rows=[]; let row=[], cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if (c=='"'){ if(inQ && n=='"'){ cur+='"'; i++; } else inQ=!inQ; }
    else if(c==',' && !inQ){ row.push(cur); cur=''; }
    else if((c=='\n'||c=='\r') && !inQ){ if(cur!==''||row.length){ row.push(cur); rows.push(row); row=[]; cur=''; } if(c=='\r'&&n=='\n') i++; }
    else cur+=c;
  }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows;
}
