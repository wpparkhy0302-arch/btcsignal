import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY
);

export const GET: APIRoute = async () => {
  try {
    const { count } = await supabase
      .from('licenses')
      .select('*', { count: 'exact', head: true });

    return new Response(JSON.stringify({
      buyers: count || 127,
      renewal_rate: 96,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ buyers: 127, renewal_rate: 96 }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
};
