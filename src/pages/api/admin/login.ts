import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const password = form.get('password')?.toString() ?? '';

  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return new Response('ADMIN_PASSWORD가 설정되지 않았습니다.', { status: 500 });
  }

  if (password !== adminPassword) {
    return redirect('/admin/login?error=1');
  }

  const token = createHmac('sha256', adminPassword).update('admin-session').digest('hex');

  cookies.set('admin_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return redirect('/admin');
};
