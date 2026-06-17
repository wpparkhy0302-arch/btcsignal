import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () =>
    chars[randomBytes(1)[0] % chars.length]
  ).join('');
  return `BTCAI-${seg()}-${seg()}-${seg()}`;
}

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('X-Admin-Token') ?? '';
  if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
    return json({ ok: false, msg: '인증 실패' }, 401);
  }

  try {
    const { name, months, max_devices } = await request.json();

    if (!name || typeof months !== 'number') {
      return json({ ok: false, msg: '이름과 기간을 입력하세요.' }, 400);
    }

    const isPermanent = months >= 120;
    const expiresAt = isPermanent
      ? null
      : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();

    let key = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateKey();
      const { data } = await supabase
        .from('licenses')
        .select('key')
        .eq('key', candidate)
        .maybeSingle();
      if (!data) { key = candidate; break; }
    }

    if (!key) return json({ ok: false, msg: '키 생성 실패, 다시 시도하세요.' }, 500);

    const { error } = await supabase.from('licenses').insert({
      key,
      plan: isPermanent ? 'permanent' : String(months),
      status: 'active',
      buyer_name: name,
      max_devices: max_devices ?? 1,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (error) return json({ ok: false, msg: error.message }, 500);

    return json({
      ok: true,
      key,
      expires_at: expiresAt,
      expires: expiresAt
        ? new Date(expiresAt).toLocaleDateString('ko-KR')
        : '영구',
    });
  } catch (e) {
    return json({ ok: false, msg: '서버 오류' }, 500);
  }
};
