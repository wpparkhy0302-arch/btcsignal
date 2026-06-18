import type { APIRoute } from 'astro';

const WP_API = 'https://wordpress-1588000-6280934.cloudwaysapps.com/wp-json/btcai/v1';

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(WP_API + '/stats', {
      headers: { 'Accept': 'application/json' },
      // @ts-ignore
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('wp stats failed');
    const data = await res.json();
    return new Response(JSON.stringify({
      buyers: data.buyers ?? 127,
      renewal_rate: data.resub_rate ?? 96,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ buyers: 127, renewal_rate: 96 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
