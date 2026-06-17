import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('X-Admin-Token') ?? '';
  if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
    return json({ ok: false, msg: '인증 실패' }, 401);
  }

  try {
    const { data, error } = await supabase
      .from('licenses')
      .select('id, key, plan, status, buyer_name, max_devices, issued_at, expires_at, last_used_at')
      .order('issued_at', { ascending: false });

    if (error) return json({ ok: false, msg: error.message }, 500);

    const rows = (data ?? []).map(r => ({
      id: r.id,
      license_key: r.key,
      buyer_name: r.buyer_name ?? '',
      months: r.plan === 'permanent' ? 120 : Number(r.plan) || 0,
      status: r.status,
      max_devices: r.max_devices,
      issued_at: r.issued_at,
      expires_at: r.expires_at,
      last_used: r.last_used_at,
    }));

    return json(rows);
  } catch (e) {
    return json({ ok: false, msg: '서버 오류' }, 500);
  }
};
