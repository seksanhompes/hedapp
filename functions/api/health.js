export const onRequest = async ({ env }) => {
  if (!env.DB) {
    return new Response(JSON.stringify({
      ok: false,
      hint: "Missing D1 binding named 'DB'. Pages → Settings → Functions → Bindings → Add D1, name = DB."
    }), { status: 500, headers: { 'content-type': 'application/json' }});
  }
  try {
    await env.DB.prepare('SELECT 1').all();
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' }});
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
};
