import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET: 세션 확인
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('btcai_session');
    if (!sessionCookie?.value) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session?.key) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // DB에서 유효성 재확인
    const { data } = await supabase
      .from('licenses')
      .select('status, expires_at, plan')
      .eq('key', session.key)
      .single();

    if (!data || data.status !== 'active') {
      cookies.delete('btcai_session', { path: '/' });
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      cookies.delete('btcai_session', { path: '/' });
      return new Response(JSON.stringify({ ok: false, msg: 'expired' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, plan: data.plan }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: 로그아웃
export const DELETE: APIRoute = async ({ cookies }) => {
  cookies.delete('btcai_session', { path: '/' });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};
