import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { key } = await request.json();

    if (!key) {
      return new Response(JSON.stringify({ ok: false, msg: 'License key is required.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // DB에서 라이선스 키 조회
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', key.toUpperCase())
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ ok: false, msg: 'Invalid license key.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 만료일 체크
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ ok: false, msg: 'License key has expired.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 상태 체크
    if (data.status !== 'active') {
      return new Response(JSON.stringify({ ok: false, msg: 'License key is inactive.' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 마지막 사용 업데이트
    await supabase
      .from('licenses')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', key.toUpperCase());

    // 세션 쿠키 저장 (7일)
    cookies.set('btcai_session', JSON.stringify({ key: key.toUpperCase(), valid: true }), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return new Response(JSON.stringify({ ok: true, plan: data.plan, expires_at: data.expires_at }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, msg: 'Server error.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
