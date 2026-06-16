import type { APIRoute } from 'astro';

const NOWPAYMENTS_API_KEY = import.meta.env.NOWPAYMENTS_API_KEY;
const BASE_URL = import.meta.env.PUBLIC_BASE_URL; // e.g. https://btcsignal.ai

const PLANS: Record<string, { amount: number; months: number; label: string }> = {
  '1month':  { amount: 39,  months: 1,  label: '1 Month' },
  '3month':  { amount: 99,  months: 3,  label: '3 Months' },
  '12month': { amount: 249, months: 12, label: '12 Months' },
};

export const GET: APIRoute = async ({ url }) => {
  const plan = url.searchParams.get('plan') || '';
  const planData = PLANS[plan];

  if (!planData) {
    return new Response('Invalid plan', { status: 400 });
  }

  try {
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: planData.amount,
        price_currency: 'usd',
        pay_currency: 'usdttrc20', // USDT TRC20 기본
        order_id: `btcai_${plan}_${Date.now()}`,
        order_description: `BTC Signal AI — ${planData.label}`,
        ipn_callback_url: `${BASE_URL}/api/payment/webhook`,
        success_url: `${BASE_URL}/payment/success`,
        cancel_url: `${BASE_URL}/#pricing`,
        is_fixed_rate: true,
        is_fee_paid_by_user: false,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error('NOWPayments error:', data);
      return new Response(JSON.stringify({ error: 'Payment creation failed' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // NOWPayments 결제 페이지로 리다이렉트
    return new Response(null, {
      status: 302,
      headers: { Location: data.invoice_url }
    });

  } catch (e) {
    console.error('Payment error:', e);
    return new Response('Server error', { status: 500 });
  }
};
