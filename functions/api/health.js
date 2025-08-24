import { corsHeaders, json } from '../_lib/schema.js';

export const onRequestOptions = ({ request }) => new Response(null, { headers: corsHeaders(request) });

export async function onRequest({ request, env }) {
  const headers = corsHeaders(request);
  try {
    // แค่ลอง query เบาๆ
    await env.DB.prepare('SELECT 1').all();
    return json({ ok: true }, { headers });
  } catch (e) {
    return json({ ok: false, error: String(e) }, { status: 500, headers });
  }
}
