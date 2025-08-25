// functions/api/market.js
export async function onRequest() {
  return new Response(JSON.stringify({ ok: true, ping: 'market' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
