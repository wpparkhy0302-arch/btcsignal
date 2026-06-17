import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

const PLAN_MONTHS: Record<string, number> = {
  '1month': 1,
  '3month': 3,
  '12month': 12,
};

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [5, 4, 4, 4];
  return segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-nowpayments-sig');

    // HMAC 서명 검증
    if (IPN_SECRET && signature) {
      const hmac = crypto
        .createHmac('sha512', IPN_SECRET)
        .update(JSON.stringify(JSON.parse(body)))
        .digest('hex');
      if (hmac !== signature) {
        console.error('Invalid IPN signature');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const payment = JSON.parse(body);
    console.log('Payment webhook received:', payment.payment_status, payment.order_id);

    // 결제 완료 상태만 처리
    if (payment.payment_status !== 'finished' && payment.payment_status !== 'confirmed') {
      return new Response('OK', { status: 200 });
    }

    // order_id 파싱: btcai_1month_1234567890
    const parts = (payment.order_id || '').split('_');
    const plan = parts[1] || '1month';
    const months = PLAN_MONTHS[plan] || 1;

    // 만료일 계산
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // 중복 처리 방지: payment_id 확인
    const { data: existing } = await supabase
      .from('licenses')
      .select('id')
      .eq('payment_id', payment.payment_id)
      .single();

    if (existing) {
      console.log('Already processed:', payment.payment_id);
      return new Response('OK', { status: 200 });
    }

    // 라이선스 키 생성 (중복 없을 때까지)
    let licenseKey = '';
    let attempts = 0;
    while (attempts < 5) {
      licenseKey = generateLicenseKey();
      const { data: dup } = await supabase
        .from('licenses')
        .select('id')
        .eq('key', licenseKey)
        .single();
      if (!dup) break;
      attempts++;
    }

    // DB 저장
    const { error } = await supabase
      .from('licenses')
      .insert({
        key: licenseKey,
        plan: plan,
        status: 'active',
        payment_id: payment.payment_id,
        payment_amount: payment.price_amount,
        payment_currency: payment.price_currency,
        buyer_email: payment.payer_email || null,
        issued_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        max_devices: 2,
      });

    if (error) {
      console.error('DB insert error:', error);
      return new Response('DB Error', { status: 500 });
    }

    console.log(`✅ License created: ${licenseKey} for plan ${plan}`);

    // TODO: 이메일 발송 (Resend API)
    // if (payment.payer_email) { await sendLicenseEmail(payment.payer_email, licenseKey, plan, expiresAt); }

    return new Response('OK', { status: 200 });

  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Server error', { status: 500 });
  }
};
