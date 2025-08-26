// /functions/api/market.js
export async function onRequest({ env, request }) {
  // 1) ตั้งค่า URL และ (ถ้ามี) API key ผ่าน Variables ของ Cloudflare Pages
  const API_URL = env.MARKET_API_URL;              // เช่น https://example.com/prices
  const API_KEY = env.MARKET_API_KEY || "";        // ถ้าต้องใช้ก็ใส่ ไม่ใช้ก็ปล่อยว่าง

  if (!API_URL) {
    return json({ ok: false, error: "Missing MARKET_API_URL" }, 500);
  }

  // 2) cache ที่ edge (10 นาที)
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url)); 
  let cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const headers = { "Accept": "application/json" };
    // ถ้า API ใช้ header แบบ Authorization / X-API-Key ปรับตรงนี้
    if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;
    // หรือ headers["X-API-Key"] = API_KEY;

    const upstream = await fetch(API_URL, { headers });
    if (!upstream.ok) throw new Error(`Upstream ${upstream.status}`);

    const data = await upstream.json(); // สมมติ upstream เป็น JSON
    const items = normalize(data);      // แปลงให้เป็นรูปแบบที่หน้าเว็บใช้

    const body = JSON.stringify({
      ok: true,
      items,
      updated_at: new Date().toISOString(),
    });

    const resp = new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=600" // 10 นาที
      }
    });
    await cache.put(cacheKey, resp.clone());
    return resp;

  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function normalize(data) {
  // ตัวอย่าง mapping – ปรับให้ตรงกับรูป JSON ของ API ที่คุณใช้
  // สมมุติ data.items = [{ name, min, max, market, updated }, ...]
  const rows = (data.items || data.results || data.data || data).map((r) => {
    const low  = num(r.min ?? r.low ?? r.price_low ?? r.price ?? 0);
    const high = num(r.max ?? r.high ?? r.price_high ?? r.price ?? 0);
    return {
      type: mapType(r.name),              // 'nangfah' | 'bod' | 'khon' | 'other'
      low, high,
      area: r.market ?? r.area ?? r.province ?? "-",
      updated_at: r.updated ?? r.timestamp ?? new Date().toISOString(),
      avg: +( (low + high) / 2 ).toFixed(2),
    };
  });
  return rows.filter(x => x.type);       // กรองรายการที่ map ชื่อไม่ได้
}

function mapType(name = "") {
  const s = String(name).trim().toLowerCase();
  if (s.includes("นางฟ้า")) return "nangfah";
  if (s.includes("บด"))    return "bod";
  if (s.includes("ขอน"))   return "khon";
  return "other";
}
const num = (v) => Number(v ?? 0);
const json = (obj, status=200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
