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

export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('X-Admin-Token') ?? '';
  if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
    return json({ ok: false, msg: '인증 실패' }, 401);
  }

  try {
    const { id, status } = await request.json();

    if (!id || !status) return json({ ok: false, msg: '필수 값 누락' }, 400);
    if (!['active', 'suspended'].includes(status)) {
      return json({ ok: false, msg: '잘못된 상태값' }, 400);
    }

    const { error } = await supabase
      .from('licenses')
      .update({ status })
      .eq('id', id);

    if (error) return json({ ok: false, msg: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, msg: '서버 오류' }, 500);
  }
};
