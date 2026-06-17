import type { APIRoute } from 'astro';

const PLANS: Record<string, { amount: number; months: number; label: string }> = {
  '1month':  { amount: 39,  months: 1,  label: '1 Month' },
  '3month':  { amount: 99,  months: 3,  label: '3 Months' },
  '12month': { amount: 249, months: 12, label: '12 Months' },
};

export const GET: APIRoute = async ({ url }) => {
  const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
  const BASE_URL = process.env.PUBLIC_BASE_URL;

  const plan = url.searchParams.get('plan') || '';
  const planData = PLANS[plan];

  if (!planData) {
    return new Response('Invalid plan', { status: 400 });
  }

  if (!NOWPAYMENTS_API_KEY) {
    console.error('Missing NOWPAYMENTS_API_KEY');
    return new Response('Server configuration error', { status: 500 });
  }

  let step = 'init';
  try {
    step = 'fetch';
    const res = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: planData.amount,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: `btcai_${plan}_${Date.now()}`,
        order_description: `BTC Signal AI - ${planData.label}`,
        ipn_callback_url: `${BASE_URL}/api/payment/webhook`,
        success_url: `${BASE_URL}/payment/success`,
        cancel_url: `${BASE_URL}/#pricing`,
        is_fixed_rate: false,
        is_fee_paid_by_user: false,
      }),
    });

    step = 'json';
    const text = await res.text();
    console.log('NOWPayments raw response:', res.status, text.substring(0, 500));
    const data = JSON.parse(text);

    if (!res.ok || !data.invoice_url) {
      console.error('NOWPayments error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Payment creation failed', detail: data }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: data.invoice_url }
    });

  } catch (e) {
    console.error(`Payment error at step [${step}]:`, String(e));
    return new Response(JSON.stringify({ error: String(e), step }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
